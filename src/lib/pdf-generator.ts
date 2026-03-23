import PDFDocument from 'pdfkit'

interface OrderItem {
  name: string
  unit: string
  quantity: number
  referenceValue: number
}

interface TimelineEvent {
  step: string
  occurredAt: Date | string
  user?: { fullName: string | null } | null
}

interface OrderPdfData {
  code: string
  status: string
  category: string
  description: string
  createdAt: Date | string
  secretaryName: string
  subSecretaryName?: string | null
  createdByName?: string | null
  items: OrderItem[]
  timeline: TimelineEvent[]
  signerName: string
  signerRole: string
  documentHash: string
  generatedAt: Date
}

const STEP_LABELS: Record<string, string> = {
  CREATED: 'Criada',
  QUOTATION_OPENED: 'Cotação Aberta',
  QUOTATION_CLOSED: 'Cotação Fechada',
  APPROVED: 'Aprovada',
  DELIVERED: 'Entregue',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  OPEN: 'Aberta',
  IN_QUOTATION: 'Em Cotação',
  APPROVED: 'Aprovada',
  DELIVERED: 'Entregue',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
}

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('pt-BR')
}

function formatDateTime(d: Date | string) {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const PRIMARY = '#1a56db'
const DARK = '#111827'
const MUTED = '#6b7280'
const LIGHT_GRAY = '#f3f4f6'
const BORDER = '#e5e7eb'

export function generateOrderPdf(data: OrderPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 60, left: 50, right: 50 },
      info: {
        Title: `Ordem de Serviço ${data.code}`,
        Author: 'BI Araçuaí — Prefeitura Municipal de Araçuaí/MG',
        Subject: `OS ${data.code} — ${STATUS_LABELS[data.status] ?? data.status}`,
        CreationDate: data.generatedAt,
        Keywords: `OS, ${data.code}, ${data.secretaryName}`,
      },
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
    let y = doc.page.margins.top

    // ─── HEADER ────────────────────────────────────────────────────────────────
    doc.rect(doc.page.margins.left, y, pageWidth, 56).fill(PRIMARY)

    doc.fillColor('#fff').fontSize(16).font('Helvetica-Bold')
      .text('ORDEM DE SERVIÇO', doc.page.margins.left + 12, y + 10, { width: pageWidth - 12 })

    doc.fontSize(11).font('Helvetica')
      .text('Prefeitura Municipal de Araçuaí/MG · Sistema BI Araçuaí', doc.page.margins.left + 12, y + 32)

    doc.fillColor(PRIMARY).fontSize(18).font('Helvetica-Bold')
      .text(data.code, doc.page.margins.left + pageWidth - 100, y + 16, { width: 88, align: 'right' })

    y += 72

    // ─── INFO GRID ─────────────────────────────────────────────────────────────
    const col = pageWidth / 2 - 6
    const drawCell = (label: string, value: string, cx: number, cy: number, w = col) => {
      doc.rect(cx, cy, w, 36).fill(LIGHT_GRAY)
      doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(label, cx + 6, cy + 5)
      doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold').text(value, cx + 6, cy + 18, { width: w - 12, ellipsis: true })
    }

    drawCell('Código', data.code, doc.page.margins.left, y)
    drawCell('Status', STATUS_LABELS[data.status] ?? data.status, doc.page.margins.left + col + 12, y)
    y += 42

    drawCell('Secretaria', data.secretaryName, doc.page.margins.left, y)
    drawCell('Criado em', formatDate(data.createdAt), doc.page.margins.left + col + 12, y)
    y += 42

    drawCell('Criado por', data.createdByName ?? '-', doc.page.margins.left, y)
    drawCell('Categoria', data.category, doc.page.margins.left + col + 12, y)
    y += 52

    // ─── DESCRIPTION ───────────────────────────────────────────────────────────
    doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold').text('DESCRIÇÃO', doc.page.margins.left, y)
    y += 12
    doc.fontSize(9).font('Helvetica').fillColor(DARK)
      .text(data.description, doc.page.margins.left, y, { width: pageWidth, lineGap: 3 })
    y = doc.y + 16

    // ─── ITEMS TABLE ───────────────────────────────────────────────────────────
    doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.margins.left + pageWidth, y)
      .strokeColor(BORDER).lineWidth(1).stroke()
    y += 6

    doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold').text('ITENS DA ORDEM DE SERVIÇO', doc.page.margins.left, y)
    y += 14

    // Table header
    const cols = [220, 55, 55, 75, 75]
    const headers = ['Item', 'Unid.', 'Qtd.', 'Valor Unit.', 'Total']
    let x = doc.page.margins.left
    doc.rect(x, y, pageWidth, 18).fill('#1a56db')
    headers.forEach((h, i) => {
      doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold')
        .text(h, x + 4, y + 5, { width: cols[i] - 4, align: i > 1 ? 'right' : 'left' })
      x += cols[i]
    })
    y += 18

    let totalValue = 0
    data.items.forEach((item, idx) => {
      const rowH = 16
      if (idx % 2 === 0) {
        doc.rect(doc.page.margins.left, y, pageWidth, rowH).fill(LIGHT_GRAY)
      }
      const lineTotal = item.quantity * item.referenceValue
      totalValue += lineTotal
      x = doc.page.margins.left
      const row = [item.name, item.unit, String(item.quantity), formatCurrency(item.referenceValue), formatCurrency(lineTotal)]
      row.forEach((v, i) => {
        doc.fillColor(DARK).fontSize(8).font('Helvetica')
          .text(v, x + 4, y + 4, { width: cols[i] - 4, align: i > 1 ? 'right' : 'left', ellipsis: true })
        x += cols[i]
      })
      y += rowH
    })

    // Total row
    doc.rect(doc.page.margins.left, y, pageWidth, 20).fill('#dbeafe')
    doc.fillColor(PRIMARY).fontSize(9).font('Helvetica-Bold')
      .text('VALOR TOTAL', doc.page.margins.left + 4, y + 6, { width: pageWidth - 84 })
      .text(formatCurrency(totalValue), doc.page.margins.left + pageWidth - 84, y + 6, { width: 76, align: 'right' })
    y += 28

    // ─── TIMELINE ──────────────────────────────────────────────────────────────
    if (y > doc.page.height - 180) {
      doc.addPage()
      y = doc.page.margins.top
    }

    doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold').text('LINHA DO TEMPO', doc.page.margins.left, y)
    y += 14

    data.timeline.forEach((event) => {
      doc.circle(doc.page.margins.left + 6, y + 5, 4).fill(PRIMARY)
      doc.moveTo(doc.page.margins.left + 6, y + 9).lineTo(doc.page.margins.left + 6, y + 18)
        .strokeColor('#d1d5db').lineWidth(1).stroke()

      doc.fillColor(DARK).fontSize(8).font('Helvetica-Bold')
        .text(STEP_LABELS[event.step] ?? event.step, doc.page.margins.left + 20, y + 1)
      doc.fillColor(MUTED).fontSize(7.5).font('Helvetica')
        .text(
          `${formatDateTime(event.occurredAt)}${event.user?.fullName ? ` · ${event.user.fullName}` : ''}`,
          doc.page.margins.left + 20, y + 11,
        )
      y += 22
    })

    y += 16

    // ─── DIGITAL SIGNATURE BLOCK ───────────────────────────────────────────────
    if (y > doc.page.height - 160) {
      doc.addPage()
      y = doc.page.margins.top
    }

    doc.rect(doc.page.margins.left, y, pageWidth, 110).fill('#f9fafb').stroke()

    doc.fillColor(PRIMARY).fontSize(9).font('Helvetica-Bold')
      .text('MARCADOR DIGITAL DE AUTENTICIDADE', doc.page.margins.left + 8, y + 8)

    doc.fillColor(MUTED).fontSize(7.5).font('Helvetica')
      .text(
        'Este documento foi gerado eletronicamente pelo Sistema BI Araçuaí. O código de verificação abaixo confirma a integridade do documento.',
        doc.page.margins.left + 8, y + 22, { width: pageWidth - 16 },
      )

    doc.fillColor(DARK).fontSize(8).font('Helvetica-Bold')
      .text('Código de Verificação (SHA-256):', doc.page.margins.left + 8, y + 44)
    doc.fillColor('#374151').fontSize(7.5).font('Courier')
      .text(data.documentHash, doc.page.margins.left + 8, y + 56, { width: pageWidth - 16 })

    doc.fillColor(DARK).fontSize(8).font('Helvetica-Bold')
      .text('Gerado por:', doc.page.margins.left + 8, y + 74)
    doc.fillColor('#374151').fontSize(8).font('Helvetica')
      .text(`${data.signerName} — ${data.signerRole}`, doc.page.margins.left + 8, y + 84)
    doc.text(`Em: ${formatDateTime(data.generatedAt)}`, doc.page.margins.left + 8, y + 94)

    y += 118

    // ─── SIGNATURE LINE ────────────────────────────────────────────────────────
    const sigColW = (pageWidth - 24) / 3
    const sigX = [
      doc.page.margins.left,
      doc.page.margins.left + sigColW + 12,
      doc.page.margins.left + (sigColW + 12) * 2,
    ]
    const sigLabels = ['Solicitante', 'Gestor da Secretaria', 'Gestor Principal']

    sigX.forEach((sx, i) => {
      doc.moveTo(sx, y + 28).lineTo(sx + sigColW, y + 28).strokeColor('#374151').lineWidth(0.5).stroke()
      doc.fillColor(MUTED).fontSize(7.5).font('Helvetica')
        .text(sigLabels[i], sx, y + 32, { width: sigColW, align: 'center' })
    })

    // ─── FOOTER ────────────────────────────────────────────────────────────────
    const totalPages = doc.bufferedPageRange().count + 1
    doc.rect(0, doc.page.height - 36, doc.page.width, 36).fill('#f3f4f6')
    doc.fillColor(MUTED).fontSize(7).font('Helvetica')
      .text(
        `Prefeitura Municipal de Araçuaí/MG · Sistema BI Araçuaí · Pregão nº 008/2026 · Gerado em ${formatDateTime(data.generatedAt)} · Pág. ${totalPages}`,
        20, doc.page.height - 23,
        { align: 'center', width: doc.page.width - 40 },
      )

    doc.end()
  })
}
