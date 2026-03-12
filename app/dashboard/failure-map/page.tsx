'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, GitFork } from 'lucide-react'
import FailurePropagation from '@/components/FailurePropagation'
import Link from 'next/link'

type MonitorData = { id: string; name: string; url: string; latest_status?: string | null; uptime_percentage?: number | null }

export default function FailureMapPage() {
  const router = useRouter()
  const [monitors, setMonitors] = useState<MonitorData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMonitors = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase.from('monitors').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (!data) { setLoading(false); return }
    const enriched = await Promise.all(data.map(async (m) => {
      const { data: latest } = await supabase.from('heartbeats').select('status').eq('monitor_id', m.id).order('created_at', { ascending: false }).limit(1).single()
      const { data: h24 } = await supabase.from('heartbeats').select('status').eq('monitor_id', m.id).gte('created_at', new Date(Date.now() - 86400000).toISOString())
      const up = h24?.filter((h: {status: string}) => h.status === 'UP').length || 0
      const total = h24?.length || 0
      return { id: m.id, name: m.name, url: m.url, latest_status: latest?.status || null, uptime_percentage: total > 0 ? Math.round(up / total * 10000) / 100 : null }
    }))
    setMonitors(enriched)
    setLoading(false)
  }, [router])

  useEffect(() => { fetchMonitors() }, [fetchMonitors])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <header style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '0 32px', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', height: 72, display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #f43f5e, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(244, 63, 94, 0.2)' }}>
              <GitFork size={20} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>Failure Propagation Map</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Blast radius simulation · Cascade analysis</div>
            </div>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 1300, margin: '0 auto', padding: '40px 32px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
            <div className="skeleton" style={{ height: 500, borderRadius: 24 }} />
            <div className="skeleton" style={{ height: 500, borderRadius: 24 }} />
          </div>
        ) : monitors.length < 2 ? (
          <div style={{ textAlign: 'center', padding: '80px 32px' }}>
            <GitFork size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Add 2+ monitors to see the propagation map</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>The failure map shows how outages cascade across your services.</p>
            <Link href="/dashboard" className="btn-primary" style={{ textDecoration: 'none' }}>Add Monitors</Link>
          </div>
        ) : (
          <FailurePropagation monitors={monitors} />
        )}
      </main>
    </div>
  )
}
