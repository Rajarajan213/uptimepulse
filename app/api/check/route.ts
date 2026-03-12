export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { pingUrl } from '@/lib/monitoring'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { monitorId, url } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  const result = await pingUrl(url)

  if (monitorId) {
    const admin = supabaseAdmin()
    await admin.from('heartbeats').insert({
      monitor_id: monitorId,
      status: result.status,
      response_time: result.response_time,
      status_code: result.status_code,
      error: result.error,
    })
  }

  return NextResponse.json(result)
}
