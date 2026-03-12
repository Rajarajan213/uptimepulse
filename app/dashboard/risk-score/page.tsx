'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import RiskScore from '@/components/RiskScore'
import Link from 'next/link'

type MonitorData = { id: string; name: string; url: string; latest_status?: string | null; avg_response_time?: number | null; uptime_percentage?: number | null }

export default function RiskScorePage() {
  const router = useRouter()
  const [monitors, setMonitors] = useState<MonitorData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMonitors = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase.from('monitors').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (!data) { setLoading(false); return }
    const enriched = await Promise.all(data.map(async (m) => {
      const { data: latest } = await supabase.from('heartbeats').select('status, response_time').eq('monitor_id', m.id).order('created_at', { ascending: false }).limit(1).single()
      const { data: h24 } = await supabase.from('heartbeats').select('status, response_time').eq('monitor_id', m.id).gte('created_at', new Date(Date.now() - 86400000).toISOString())
      const up = h24?.filter((h: {status: string}) => h.status === 'UP').length || 0
      const total = h24?.length || 0
      const avg = h24 && h24.length > 0 ? Math.round(h24.reduce((a: number, h: {response_time: number|null}) => a + (h.response_time || 0), 0) / h24.length) : null
      return { id: m.id, name: m.name, url: m.url, latest_status: latest?.status || null, avg_response_time: avg, uptime_percentage: total > 0 ? Math.round(up / total * 10000) / 100 : null }
    }))
    setMonitors(enriched)
    setLoading(false)
  }, [router])

  useEffect(() => { fetchMonitors() }, [fetchMonitors])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <header style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '0 32px', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13 }}>
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #ef4444, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={16} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>AI Website Risk Score</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>AI-computed reliability & risk assessment</div>
            </div>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 1300, margin: '0 auto', padding: '32px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 220, borderRadius: 16 }} />)}
          </div>
        ) : (
          <RiskScore monitors={monitors} />
        )}
      </main>
    </div>
  )
}
