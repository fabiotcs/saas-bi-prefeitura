import nodemailer from 'nodemailer'

export const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export const FROM_ADDRESS =
  process.env.SMTP_FROM ?? 'BI Araçuaí <noreply@prefeitura-aracuai.mg.gov.br>'

export interface FraudAlertEmailData {
  userName: string
  userEmail: string
  fraudLevel: 'MEDIUM' | 'HIGH'
  livenessScore: number
  similarityScore: number
  aiEstimatedAge?: number
  aiEstimatedGender?: string
  documentMatch: boolean
  ipAddress: string
  occurredAt: string
  recipientName: string
  recipientEmail: string
}

export function buildFraudAlertEmailHtml(data: FraudAlertEmailData): string {
  const levelColor = data.fraudLevel === 'HIGH' ? '#dc2626' : '#d97706'
  const levelBg = data.fraudLevel === 'HIGH' ? '#fef2f2' : '#fffbeb'
  const levelLabel = data.fraudLevel === 'HIGH' ? 'ALTO — Possível Fraude' : 'MÉDIO — Inconsistência Detectada'
  const icon = data.fraudLevel === 'HIGH' ? '🚨' : '⚠️'

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;margin:0;padding:0;background:#f9fafb;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
  <tr>
    <td style="background:${levelColor};padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;">${icon} Alerta Biométrico — Nível ${data.fraudLevel === 'HIGH' ? 'Alto' : 'Médio'}</h1>
      <p style="margin:4px 0 0;color:#fff;opacity:0.85;font-size:13px;">Prefeitura Municipal de Araçuaí · Sistema BI</p>
    </td>
  </tr>
  <tr>
    <td style="padding:24px 32px;">
      <p style="margin:0 0 16px;font-size:14px;color:#374151;">Olá, <strong>${data.recipientName}</strong>. Uma autenticação biométrica suspeita foi detectada.</p>

      <div style="background:${levelBg};border:1px solid ${levelColor};border-radius:8px;padding:16px;margin-bottom:20px;">
        <p style="margin:0;font-weight:700;color:${levelColor};font-size:14px;">${icon} Nível de Alerta: ${levelLabel}</p>
      </div>

      <h3 style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin:0 0 12px;">Usuário Identificado</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <tr style="background:#f9fafb;"><td style="padding:8px 16px;font-size:13px;color:#6b7280;width:40%;">Nome</td><td style="padding:8px 16px;font-size:13px;font-weight:600;">${data.userName}</td></tr>
        <tr><td style="padding:8px 16px;font-size:13px;color:#6b7280;">E-mail</td><td style="padding:8px 16px;font-size:13px;">${data.userEmail}</td></tr>
        <tr style="background:#f9fafb;"><td style="padding:8px 16px;font-size:13px;color:#6b7280;">IP de Origem</td><td style="padding:8px 16px;font-size:13px;font-family:monospace;">${data.ipAddress}</td></tr>
        <tr><td style="padding:8px 16px;font-size:13px;color:#6b7280;">Data/Hora</td><td style="padding:8px 16px;font-size:13px;">${data.occurredAt}</td></tr>
      </table>

      <h3 style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin:0 0 12px;">Análise de IA</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <tr style="background:#f9fafb;"><td style="padding:8px 16px;font-size:13px;color:#6b7280;width:40%;">Vivacidade</td><td style="padding:8px 16px;font-size:13px;font-weight:600;color:${data.livenessScore < 40 ? '#dc2626' : '#374151'};">${(data.livenessScore * 100).toFixed(1)}%</td></tr>
        <tr><td style="padding:8px 16px;font-size:13px;color:#6b7280;">Similaridade Facial</td><td style="padding:8px 16px;font-size:13px;">${(data.similarityScore * 100).toFixed(1)}%</td></tr>
        ${data.aiEstimatedAge ? `<tr style="background:#f9fafb;"><td style="padding:8px 16px;font-size:13px;color:#6b7280;">Faixa Etária Estimada</td><td style="padding:8px 16px;font-size:13px;">~${data.aiEstimatedAge} anos</td></tr>` : ''}
        ${data.aiEstimatedGender ? `<tr><td style="padding:8px 16px;font-size:13px;color:#6b7280;">Gênero Estimado</td><td style="padding:8px 16px;font-size:13px;">${data.aiEstimatedGender}</td></tr>` : ''}
        <tr style="background:#f9fafb;"><td style="padding:8px 16px;font-size:13px;color:#6b7280;">Correspondência c/ Documento</td><td style="padding:8px 16px;font-size:13px;font-weight:600;color:${data.documentMatch ? '#16a34a' : '#dc2626'};">${data.documentMatch ? 'Sim' : 'Não'}</td></tr>
      </table>

      <p style="font-size:13px;color:#6b7280;margin:0;">Acesse o sistema para visualizar o histórico completo em <strong>Auditoria → Histórico Biométrico</strong>.</p>
    </td>
  </tr>
  <tr>
    <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
        Prefeitura Municipal de Araçuaí · Sistema BI Araçuaí · Pregão nº 008/2026
      </p>
    </td>
  </tr>
</table>
</body>
</html>`
}

export interface StockEmailData {
  totalItems: number
  alertItems: number
  topMovements: Array<{ name: string; movements: number; abcClass: string }>
  abcSummary: { A: number; B: number; C: number }
  recipientName: string
  recipientEmail: string
}

export function buildStockEmailHtml(data: StockEmailData): string {
  const rows = data.topMovements
    .map(
      (item, i) => `
      <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'}">
        <td style="padding:8px 12px;font-size:13px;">${item.name}</td>
        <td style="padding:8px 12px;font-size:13px;text-align:center;">${item.movements}</td>
        <td style="padding:8px 12px;font-size:13px;text-align:center;">
          <span style="
            background:${item.abcClass === 'A' ? '#dcfce7' : item.abcClass === 'B' ? '#fef9c3' : '#f3f4f6'};
            color:${item.abcClass === 'A' ? '#166534' : item.abcClass === 'B' ? '#854d0e' : '#374151'};
            padding:2px 8px;border-radius:99px;font-weight:600;font-size:11px;">
            ${item.abcClass}
          </span>
        </td>
      </tr>`,
    )
    .join('')

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;margin:0;padding:0;background:#f9fafb;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
  <tr>
    <td style="background:#1a56db;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;">Resumo Semanal de Estoque</h1>
      <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">Prefeitura Municipal de Araçuaí · BI Araçuaí</p>
    </td>
  </tr>
  <tr>
    <td style="padding:24px 32px;">
      <p style="margin:0 0 16px;font-size:14px;color:#374151;">Olá, <strong>${data.recipientName}</strong>. Aqui está o resumo do seu estoque.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td width="50%" style="padding-right:8px;">
            <div style="background:#eff6ff;border-radius:8px;padding:16px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#1d4ed8;">${data.totalItems}</div>
              <div style="font-size:12px;color:#6b7280;margin-top:4px;">Total de Itens</div>
            </div>
          </td>
          <td width="50%" style="padding-left:8px;">
            <div style="background:${data.alertItems > 0 ? '#fef2f2' : '#f0fdf4'};border-radius:8px;padding:16px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:${data.alertItems > 0 ? '#dc2626' : '#16a34a'};">${data.alertItems}</div>
              <div style="font-size:12px;color:#6b7280;margin-top:4px;">Itens com Alerta</div>
            </div>
          </td>
        </tr>
      </table>

      <h3 style="font-size:14px;font-weight:700;color:#111827;margin:0 0 8px;">Curva ABC</h3>
      <div style="display:flex;gap:8px;margin-bottom:24px;">
        <span style="background:#dcfce7;color:#166534;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:600;">A: ${data.abcSummary.A} itens</span>
        <span style="background:#fef9c3;color:#854d0e;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:600;">B: ${data.abcSummary.B} itens</span>
        <span style="background:#f3f4f6;color:#374151;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:600;">C: ${data.abcSummary.C} itens</span>
      </div>

      <h3 style="font-size:14px;font-weight:700;color:#111827;margin:0 0 8px;">Top 5 Mais Movimentados</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;font-size:12px;text-align:left;color:#6b7280;font-weight:600;">Item</th>
            <th style="padding:8px 12px;font-size:12px;text-align:center;color:#6b7280;font-weight:600;">Movimentações</th>
            <th style="padding:8px 12px;font-size:12px;text-align:center;color:#6b7280;font-weight:600;">ABC</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </td>
  </tr>
  <tr>
    <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
        Prefeitura Municipal de Araçuaí · Sistema BI Araçuaí · Pregão nº 008/2026
      </p>
    </td>
  </tr>
</table>
</body>
</html>`
}
