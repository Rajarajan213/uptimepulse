export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { pingUrl } from '@/lib/monitoring'
import { sendDownAlert, sendUpAlert } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = supabaseAdmin()

  // Fetch all active monitors with user emails
  const { data: monitors, error } = await admin
    .from('monitors')
    .select('*, auth_users:user_id (email)')
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = []

  for (const monitor of monitors || []) {
    try {
      const pingResult = await pingUrl(monitor.url)

      // Insert heartbeat
      await admin.from('heartbeats').insert({
        monitor_id: monitor.id,
        status: pingResult.status,
        response_time: pingResult.response_time,
        status_code: pingResult.status_code,
        error: pingResult.error,
      })

      // Get previous heartbeat to detect status change
      const { data: prevHeartbeat } = await admin
        .from('heartbeats')
        .select('status')
        .eq('monitor_id', monitor.id)
        .order('created_at', { ascending: false })
        .limit(2)

      const previousStatus = prevHeartbeat?.[1]?.status

      // Handle incident tracking and notifications
      if (pingResult.status === 'DOWN' && previousStatus === 'UP') {
        // Open new incident
        await admin.from('incidents').insert({
          monitor_id: monitor.id,
          type: 'DOWN',
          error: pingResult.error,
        })

        // Get user email from auth
        const { data: userData } = await admin.auth.admin.getUserById(monitor.user_id)
        if (userData?.user?.email) {
          await sendDownAlert({
            to: userData.user.email,
            monitorName: monitor.name,
            url: monitor.url,
            error: pingResult.error,
            timestamp: new Date().toISOString(),
          }).catch(() => {}) // Don't fail cron if email fails
        }
      } else if (pingResult.status === 'UP' && previousStatus === 'DOWN') {
        // Close open incident
        const { data: openIncident } = await admin
          .from('incidents')
          .select('id')
          .eq('monitor_id', monitor.id)
          .is('resolved_at', null)
          .limit(1)
          .single()

        if (openIncident) {
          await admin
            .from('incidents')
            .update({ resolved_at: new Date().toISOString() })
            .eq('id', openIncident.id)
        }

        // Send recovery email
        const { data: userData } = await admin.auth.admin.getUserById(monitor.user_id)
        if (userData?.user?.email) {
          await sendUpAlert({
            to: userData.user.email,
            monitorName: monitor.name,
            url: monitor.url,
            responseTime: pingResult.response_time,
            timestamp: new Date().toISOString(),
          }).catch(() => {})
        }
      }

      results.push({ id: monitor.id, name: monitor.name, ...pingResult })
    } catch (err) {
      console.error(`Failed to check ${monitor.url}:`, err)
    }
  }

  return NextResponse.json({ checked: results.length, results })
}
