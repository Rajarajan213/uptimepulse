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
        <div style={{ maxWidth: 1300, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13 }}>
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #ef4444, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GitFork size={16} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Failure Propagation Map</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Blast radius simulation · Cascade analysis</div>
            </div>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 1300, margin: '0 auto', padding: '32px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
            <div className="skeleton" style={{ height: 460, borderRadius: 16 }} />
            <div className="skeleton" style={{ height: 460, borderRadius: 16 }} />
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
