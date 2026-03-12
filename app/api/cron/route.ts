export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { pingUrl } from '@/lib/monitoring'
import { sendDownAlert, sendUpAlert, sendRiskAlert } from '@/lib/notifications'

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

      // Check Risk Score
      const { data: h24 } = await admin.from('heartbeats').select('status, response_time').eq('monitor_id', monitor.id).gte('created_at', new Date(Date.now() - 86400000).toISOString())
      const up = h24?.filter((h: {status: string}) => h.status === 'UP').length || 0
      const total = h24?.length || 0
      const uptime = total > 0 ? (up / total) * 100 : 100
      const avg = h24 && h24.length > 0 ? h24.reduce((a: number, h: {response_time: number|null}) => a + (h.response_time || 0), 0) / h24.length : pingResult.response_time
      
      const uptimeFactor = Math.max(0, 100 - uptime * 0.95)
      const respFactor = Math.min(100, (avg / 2000) * 100)
      const incidentFactor = pingResult.status === 'DOWN' ? 80 : uptime < 98 ? 40 : 10
      const trendFactor = pingResult.status === 'DOWN' ? 70 : uptime < 99 ? 35 : 5
      
      const riskScore = Math.round(uptimeFactor * 0.35 + respFactor * 0.25 + incidentFactor * 0.25 + trendFactor * 0.15)
      
      // If critical risk (>= 70) and it wasn't critical previously, or we want to alert every time...
      // For demonstration, we'll alert if score >= 70
      if (riskScore >= 70 && pingResult.status === 'UP') {
        const { data: userData } = await admin.auth.admin.getUserById(monitor.user_id)
        if (userData?.user?.email) {
          const reasons = []
          if (uptime < 99) reasons.push(`Low 24h Uptime: ${uptime.toFixed(2)}%`)
          if (avg > 1000) reasons.push(`High average response time: ${Math.round(avg)}ms`)
          if (incidentFactor >= 40) reasons.push(`Recent incidents detected`)
          
          await sendRiskAlert({
            to: userData.user.email,
            monitorName: monitor.name,
            url: monitor.url,
            riskScore,
            reasons: reasons.length > 0 ? reasons : ['General degraded performance patterns'],
            timestamp: new Date().toISOString(),
          }).catch(() => {})
        }
      }

      results.push({ id: monitor.id, name: monitor.name, ...pingResult, riskScore })
    } catch (err) {
      console.error(`Failed to check ${monitor.url}:`, err)
    }
  }

  return NextResponse.json({ checked: results.length, results })
}
