import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UptimePulse — Website Monitoring Dashboard',
  description: 'Monitor your websites and APIs in real-time. Get instant alerts when your services go down.',
  keywords: 'uptime monitoring, website monitoring, status page, ping monitor',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
