import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  try {
    const payload = await verifyToken(token)
    if (payload.type !== 'access') return null
    return await prisma.user.findUnique({ where: { id: payload.userId } })
  } catch {
    return null
  }
}

const TIMELINE_STEP_LABELS: Record<string, string> = {
  CREATED: 'Criada',
  QUOTATION_OPENED: 'Cotação Aberta',
  QUOTATION_CLOSED: 'Cotação Fechada',
  APPROVED: 'Aprovada',
  DELIVERED: 'Entregue',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
}

const CATEGORY_LABELS: Record<string, string> = {
  MATERIAL: 'Material',
  SERVICE: 'Serviço',
  EQUIPMENT: 'Equipamento',
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

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      secretary: { select: { id: true, name: true } },
      subSecretary: { select: { id: true, name: true } },
      createdBy: { select: { id: true, fullName: true, photoUrl: true } },
      items: true,
      timeline: {
        include: {
          user: { select: { id: true, fullName: true, photoUrl: true } },
        },
        orderBy: { occurredAt: 'asc' },
      },
      deliveryLocations: true,
      invoices: true,
    },
  })

  if (!order) {
    return NextResponse.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 })
  }

  const totalValue = order.items.reduce(
    (sum, item) => sum + item.quantity * item.referenceValue,
    0
  )

  const itemsRows = order.items
    .map(
      (item) => `
      <tr>
        <td>${item.name}</td>
        <td style="text-align:center">${item.unit}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${formatCurrency(item.referenceValue)}</td>
        <td style="text-align:right">${formatCurrency(item.quantity * item.referenceValue)}</td>
      </tr>`
    )
    .join('')

  const timelineRows = order.timeline
    .map(
      (event) => `
      <div class="timeline-item">
        <div class="timeline-bullet"></div>
        <div class="timeline-content">
          <strong>${TIMELINE_STEP_LABELS[event.step] ?? event.step}</strong>
          <span class="timeline-date">${formatDateTime(event.occurredAt)}</span>
          <span class="timeline-user">Por: ${event.user?.fullName ?? '-'}</span>
        </div>
      </div>`
    )
    .join('')

  const invoiceRows = order.invoices.length > 0
    ? order.invoices
        .map(
          (inv) => `
        <tr>
          <td>${inv.establishmentName}</td>
          <td>${formatDate(inv.issuedAt)}</td>
          <td><a href="${inv.fileUrl}" target="_blank">${inv.fileUrl}</a></td>
        </tr>`
        )
        .join('')
    : '<tr><td colspan="3" style="text-align:center;color:#888">Nenhuma nota fiscal registrada</td></tr>'

  const generatedAt = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OS ${order.code} — ${order.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #1a1a1a;
      padding: 24px;
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1e40af;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .header-title h1 {
      font-size: 18px;
      color: #1e40af;
      margin-bottom: 4px;
    }
    .header-title p { color: #555; font-size: 11px; }
    .header-meta { text-align: right; font-size: 11px; color: #555; }
    .section { margin-bottom: 20px; }
    .section h2 {
      font-size: 13px;
      font-weight: bold;
      background: #f1f5f9;
      padding: 6px 10px;
      border-left: 4px solid #1e40af;
      margin-bottom: 10px;
      color: #1e3a8a;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 20px;
    }
    .info-item label {
      font-size: 10px;
      color: #777;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: block;
      margin-bottom: 2px;
    }
    .info-item span { font-size: 12px; font-weight: 500; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th {
      background: #f1f5f9;
      padding: 6px 8px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 1px solid #e5e7eb;
    }
    td {
      padding: 5px 8px;
      border-bottom: 1px solid #f3f4f6;
    }
    tr:last-child td { border-bottom: none; }
    .total-row td {
      font-weight: bold;
      border-top: 2px solid #e5e7eb;
      padding-top: 8px;
    }
    .timeline {
      position: relative;
      padding-left: 20px;
    }
    .timeline::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #e5e7eb;
    }
    .timeline-item {
      position: relative;
      margin-bottom: 12px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .timeline-bullet {
      position: absolute;
      left: -17px;
      top: 2px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #1e40af;
      border: 2px solid #fff;
      box-shadow: 0 0 0 1px #1e40af;
    }
    .timeline-content { flex: 1; }
    .timeline-content strong { display: block; font-size: 12px; color: #1e3a8a; }
    .timeline-date, .timeline-user {
      display: block;
      font-size: 10px;
      color: #6b7280;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-top: 8px;
    }
    .signature-box {
      border: 1px solid #d1d5db;
      padding: 12px;
      border-radius: 4px;
    }
    .signature-box .sig-label {
      font-size: 10px;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .signature-box .sig-line {
      border-bottom: 1px solid #9ca3af;
      margin: 24px 0 6px;
    }
    .signature-box .sig-name {
      font-size: 11px;
      font-weight: 600;
      text-align: center;
    }
    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      margin-top: 6px;
    }
    .checkbox {
      width: 12px;
      height: 12px;
      border: 1.5px solid #374151;
      display: inline-block;
      border-radius: 2px;
      position: relative;
    }
    .checkbox.checked::after {
      content: '✓';
      position: absolute;
      top: -3px;
      left: 1px;
      font-size: 11px;
      color: #1e40af;
      font-weight: bold;
    }
    .footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 10px;
      margin-top: 20px;
      text-align: center;
      font-size: 10px;
      color: #9ca3af;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="header-title">
      <h1>Ordem de Serviço — ${order.code}</h1>
      <p>${order.name}</p>
    </div>
    <div class="header-meta">
      <p><strong>Secretaria:</strong> ${order.secretary?.name ?? '-'}</p>
      <p><strong>Status:</strong> ${STATUS_LABELS[order.status] ?? order.status}</p>
      <p><strong>Categoria:</strong> ${CATEGORY_LABELS[order.category] ?? order.category}</p>
      <p><strong>Data de abertura:</strong> ${formatDate(order.createdAt)}</p>
    </div>
  </div>

  <!-- Dados Gerais -->
  <div class="section">
    <h2>Dados Gerais</h2>
    <div class="info-grid">
      <div class="info-item">
        <label>Código</label>
        <span>${order.code}</span>
      </div>
      <div class="info-item">
        <label>Área de Investimento</label>
        <span>${order.investmentArea}</span>
      </div>
      <div class="info-item">
        <label>Responsável pelo Recebimento</label>
        <span>${order.receiverName}</span>
      </div>
      <div class="info-item">
        <label>Criado por</label>
        <span>${order.createdBy?.fullName ?? '-'}</span>
      </div>
      ${order.desiredDeliveryDate ? `
      <div class="info-item">
        <label>Data de Entrega Desejada</label>
        <span>${formatDate(order.desiredDeliveryDate)}</span>
      </div>` : ''}
      ${order.quotationStartDate ? `
      <div class="info-item">
        <label>Início da Cotação</label>
        <span>${formatDate(order.quotationStartDate)}</span>
      </div>` : ''}
      ${order.quotationEndDate ? `
      <div class="info-item">
        <label>Fim da Cotação</label>
        <span>${formatDate(order.quotationEndDate)}</span>
      </div>` : ''}
      ${order.observations ? `
      <div class="info-item" style="grid-column: 1/-1">
        <label>Observações</label>
        <span>${order.observations}</span>
      </div>` : ''}
    </div>
  </div>

  <!-- Itens -->
  <div class="section">
    <h2>Itens da OS</h2>
    <table>
      <thead>
        <tr>
          <th>Nome do Item</th>
          <th style="text-align:center">Unidade</th>
          <th style="text-align:center">Quantidade</th>
          <th style="text-align:right">Valor Ref. (unit.)</th>
          <th style="text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
        <tr class="total-row">
          <td colspan="4" style="text-align:right">Total de Referência</td>
          <td style="text-align:right">${formatCurrency(totalValue)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Linha do Tempo -->
  <div class="section">
    <h2>Linha do Tempo</h2>
    <div class="timeline">
      ${timelineRows || '<p style="color:#888;font-size:11px">Nenhum evento registrado.</p>'}
    </div>
  </div>

  <!-- Notas Fiscais -->
  <div class="section">
    <h2>Notas Fiscais</h2>
    <table>
      <thead>
        <tr>
          <th>Estabelecimento</th>
          <th>Data de Emissão</th>
          <th>Arquivo</th>
        </tr>
      </thead>
      <tbody>
        ${invoiceRows}
      </tbody>
    </table>
  </div>

  <!-- Assinaturas -->
  <div class="section">
    <h2>Assinaturas</h2>
    <div class="signatures">
      <div class="signature-box">
        <div class="sig-label">Solicitante</div>
        <div class="checkbox-row">
          <span class="checkbox ${order.status !== 'DRAFT' ? 'checked' : ''}"></span>
          <span>Ordem criada</span>
        </div>
        <div class="sig-line"></div>
        <div class="sig-name">${order.createdBy?.fullName ?? '_____________________'}</div>
      </div>
      <div class="signature-box">
        <div class="sig-label">Gestor Aprovador</div>
        <div class="checkbox-row">
          <span class="checkbox ${['APPROVED', 'DELIVERED', 'COMPLETED'].includes(order.status) ? 'checked' : ''}"></span>
          <span>Aprovado pelo gestor</span>
        </div>
        <div class="sig-line"></div>
        <div class="sig-name">_____________________</div>
      </div>
      <div class="signature-box">
        <div class="sig-label">Recebedor</div>
        <div class="checkbox-row">
          <span class="checkbox ${['DELIVERED', 'COMPLETED'].includes(order.status) ? 'checked' : ''}"></span>
          <span>Entrega confirmada</span>
        </div>
        <div class="sig-line"></div>
        <div class="sig-name">${order.receiverName}</div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Documento gerado em ${generatedAt} — Sistema SaaS BI Prefeitura</p>
    <p>OS ${order.code} | ${order.secretary?.name ?? ''} | Este documento é válido como comprovante de registro digital.</p>
  </div>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="OS-${order.code}.html"`,
    },
  })
}
