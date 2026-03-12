import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendDownAlert(opts: {
  to: string
  monitorName: string
  url: string
  error: string | null
  timestamp: string
}) {
  if (!process.env.SMTP_USER) return // Skip if not configured

  const subject = `🔴 DOWN Alert: ${opts.monitorName} is unreachable`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #f8fafc; margin: 0; font-size: 24px;">🔴 Site Down Alert</h1>
        <p style="color: #94a3b8; margin: 8px 0 0;">UptimePulse Monitoring</p>
      </div>
      <div style="background: #1e293b; padding: 32px; border-radius: 0 0 12px 12px;">
        <p style="color: #e2e8f0; font-size: 16px;"><strong style="color:#f87171;">INCIDENT DETECTED</strong></p>
        <table style="width:100%; border-collapse: collapse;">
          <tr><td style="color:#94a3b8; padding: 8px 0;">Monitor</td><td style="color:#f8fafc; font-weight:bold;">${opts.monitorName}</td></tr>
          <tr><td style="color:#94a3b8; padding: 8px 0;">URL</td><td style="color:#60a5fa;">${opts.url}</td></tr>
          <tr><td style="color:#94a3b8; padding: 8px 0;">Status</td><td style="color:#f87171; font-weight:bold;">DOWN</td></tr>
          <tr><td style="color:#94a3b8; padding: 8px 0;">Error</td><td style="color:#fca5a5;">${opts.error || 'Unknown error'}</td></tr>
          <tr><td style="color:#94a3b8; padding: 8px 0;">Time</td><td style="color:#f8fafc;">${opts.timestamp}</td></tr>
        </table>
        <p style="color:#64748b; margin-top: 24px; font-size: 14px;">You'll receive another email when the site recovers.</p>
      </div>
    </div>
  `

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'UptimePulse <noreply@uptimepulse.app>',
    to: opts.to,
    subject,
    html,
  })
}

export async function sendUpAlert(opts: {
  to: string
  monitorName: string
  url: string
  responseTime: number
  timestamp: string
}) {
  if (!process.env.SMTP_USER) return

  const subject = `✅ RECOVERED: ${opts.monitorName} is back online`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #f8fafc; margin: 0; font-size: 24px;">✅ Site Recovered</h1>
        <p style="color: #94a3b8; margin: 8px 0 0;">UptimePulse Monitoring</p>
      </div>
      <div style="background: #1e293b; padding: 32px; border-radius: 0 0 12px 12px;">
        <p style="color: #e2e8f0; font-size: 16px;"><strong style="color:#4ade80;">INCIDENT RESOLVED</strong></p>
        <table style="width:100%; border-collapse: collapse;">
          <tr><td style="color:#94a3b8; padding: 8px 0;">Monitor</td><td style="color:#f8fafc; font-weight:bold;">${opts.monitorName}</td></tr>
          <tr><td style="color:#94a3b8; padding: 8px 0;">URL</td><td style="color:#60a5fa;">${opts.url}</td></tr>
          <tr><td style="color:#94a3b8; padding: 8px 0;">Status</td><td style="color:#4ade80; font-weight:bold;">UP</td></tr>
          <tr><td style="color:#94a3b8; padding: 8px 0;">Response Time</td><td style="color:#f8fafc;">${opts.responseTime}ms</td></tr>
          <tr><td style="color:#94a3b8; padding: 8px 0;">Recovered At</td><td style="color:#f8fafc;">${opts.timestamp}</td></tr>
        </table>
      </div>
    </div>
  `

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'UptimePulse <noreply@uptimepulse.app>',
    to: opts.to,
    subject,
    html,
  })
}

export async function sendRiskAlert(opts: {
  to: string
  monitorName: string
  url: string
  riskScore: number
  reasons: string[]
  timestamp: string
}) {
  if (!process.env.SMTP_USER) return

  const subject = `⚠️ High Risk Alert: ${opts.monitorName} requires attention`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1e1b4b, #312e81); padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #f8fafc; margin: 0; font-size: 24px;">⚠️ AI Risk Alert</h1>
        <p style="color: #94a3b8; margin: 8px 0 0;">UptimePulse Intelligence</p>
      </div>
      <div style="background: #1e293b; padding: 32px; border-radius: 0 0 12px 12px;">
        <p style="color: #e2e8f0; font-size: 16px;"><strong style="color:#f59e0b;">HIGH RISK LEVEL DETECTED</strong></p>
        <p style="color: #94a3b8; font-size: 14px;">The AI monitoring engine has detected degraded performance patterns that indicate a high risk of imminent failure.</p>
        <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
          <tr><td style="color:#94a3b8; padding: 8px 0; width: 30%;">Monitor</td><td style="color:#f8fafc; font-weight:bold;">${opts.monitorName}</td></tr>
          <tr><td style="color:#94a3b8; padding: 8px 0;">URL</td><td style="color:#60a5fa;">${opts.url}</td></tr>
          <tr><td style="color:#94a3b8; padding: 8px 0;">Risk Score</td><td style="color:#ef4444; font-weight:bold; font-size: 18px;">${opts.riskScore} / 100</td></tr>
          <tr><td style="color:#94a3b8; padding: 8px 0; vertical-align: top;">Risk Factors</td><td style="color:#fca5a5;">
            <ul style="margin: 0; padding-left: 20px;">
              ${opts.reasons.map(r => `<li>${r}</li>`).join('')}
            </ul>
          </td></tr>
          <tr><td style="color:#94a3b8; padding: 8px 0;">Detected At</td><td style="color:#f8fafc;">${opts.timestamp}</td></tr>
        </table>
        <p style="color:#64748b; margin-top: 24px; font-size: 14px;">Log in to the dashboard to view the full AI Risk analysis and Failure Propagation Map.</p>
      </div>
    </div>
  `

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'UptimePulse <noreply@uptimepulse.app>',
    to: opts.to,
    subject,
    html,
  })
}
