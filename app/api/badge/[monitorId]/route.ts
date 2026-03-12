export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ monitorId: string }> }
) {
  const { monitorId } = await params
  const admin = supabaseAdmin()

  const { data: heartbeat } = await admin
    .from('heartbeats')
    .select('status')
    .eq('monitor_id', monitorId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const isUp = heartbeat?.status === 'UP'
  const color = isUp ? '#22c55e' : '#ef4444'
  const label = isUp ? 'UP' : 'DOWN'
  const textColor = '#ffffff'

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="90" height="20" role="img" aria-label="status: ${label}">
  <title>status: ${label}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="90" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="45" height="20" fill="#555"/>
    <rect x="45" width="45" height="20" fill="${color}"/>
    <rect width="90" height="20" fill="url(#s)"/>
  </g>
  <g fill="${textColor}" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
    <text x="235" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="350" lengthAdjust="spacing">status</text>
    <text x="235" y="140" transform="scale(.1)" textLength="350" lengthAdjust="spacing">status</text>
    <text x="665" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="350" lengthAdjust="spacing">${label}</text>
    <text x="665" y="140" transform="scale(.1)" textLength="350" lengthAdjust="spacing">${label}</text>
  </g>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache, max-age=0',
    },
  })
}
