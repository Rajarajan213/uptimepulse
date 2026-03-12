'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Users } from 'lucide-react'
import RealUserMonitoring from '@/components/RealUserMonitoring'
import Link from 'next/link'

export default function RUMPage() {
  const router = useRouter()
  const [monitors, setMonitors] = useState<Array<{ avg_response_time?: number | null; uptime_percentage?: number | null }>>([])
  const [loading, setLoading] = useState(true)

  const fetchMonitors = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase.from('monitors').select('*').eq('user_id', user.id)
    if (!data) { setLoading(false); return }
    const enriched = await Promise.all(data.map(async (m) => {
      const { data: h24 } = await supabase.from('heartbeats').select('status, response_time').eq('monitor_id', m.id).gte('created_at', new Date(Date.now() - 86400000).toISOString())
      const up = h24?.filter((h: {status: string}) => h.status === 'UP').length || 0
      const total = h24?.length || 0
      const avg = h24 && h24.length > 0 ? Math.round(h24.reduce((a: number, h: {response_time: number|null}) => a + (h.response_time || 0), 0) / h24.length) : null
      return { avg_response_time: avg, uptime_percentage: total > 0 ? Math.round(up / total * 10000) / 100 : null }
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
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Real User Monitoring</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Core Web Vitals · Geography · Browsers</div>
            </div>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 1300, margin: '0 auto', padding: '32px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[120, 200, 160].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 16 }} />)}
          </div>
        ) : (
          <RealUserMonitoring monitors={monitors} />
        )}
      </main>
    </div>
  )
}
