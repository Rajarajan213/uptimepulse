'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Activity, Shield, ArrowLeft } from 'lucide-react'
import AISelfHealing from '@/components/AISelfHealing'
import Link from 'next/link'

type MonitorData = { id: string; name: string; url: string; latest_status?: string | null; uptime_percentage?: number | null }

export default function AISelfHealingPage() {
  const router = useRouter()
  const [monitors, setMonitors] = useState<MonitorData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMonitors = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: monitorsData } = await supabase
      .from('monitors')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!monitorsData) { setLoading(false); return }

    const enriched = await Promise.all(monitorsData.map(async (monitor) => {
      const { data: latest } = await supabase
        .from('heartbeats')
        .select('status, response_time')
        .eq('monitor_id', monitor.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const { data: last24h } = await supabase
        .from('heartbeats')
        .select('status')
        .eq('monitor_id', monitor.id)
        .gte('created_at', new Date(Date.now() - 86400000).toISOString())

      const upCount = last24h?.filter((h: {status: string}) => h.status === 'UP').length || 0
      const total = last24h?.length || 0
      const uptime = total > 0 ? (upCount / total) * 100 : null

      return {
        id: monitor.id,
        name: monitor.name,
        url: monitor.url,
        latest_status: latest?.status || null,
        uptime_percentage: uptime !== null ? Math.round(uptime * 100) / 100 : null,
      }
    }))

    setMonitors(enriched)
    setLoading(false)
  }, [router])

  useEffect(() => { fetchMonitors() }, [fetchMonitors])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <header style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '0 32px', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13 }}>
              <ArrowLeft size={14} /> Dashboard
            </Link>
            <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={16} color="white" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>AI Self-Healing System</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Automated remediation engine</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'glow-pulse 2s infinite' }} />
            <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>ENGINE ACTIVE</span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1300, margin: '0 auto', padding: '32px' }}>
        {/* Info banner */}
        <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(59,130,246,0.08))', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 16, padding: '20px 24px', marginBottom: 28, display: 'flex', gap: 20 }}>
          {[
            { icon: '🔍', label: 'Detect', desc: 'AI monitors response time spikes & failure patterns' },
            { icon: '⚡', label: 'Diagnose', desc: 'Root cause analysis across DNS, CDN, DB, App layers' },
            { icon: '🔧', label: 'Remediate', desc: 'Automated healing actions triggered within seconds' },
            { icon: '✅', label: 'Verify', desc: 'Continuous health checks confirm restoration' },
          ].map(step => (
            <div key={step.label} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{step.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{step.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{step.desc}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
            <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
            <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
          </div>
        ) : monitors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 32px' }}>
            <Activity size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No monitors found</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Add monitors from your dashboard first.</p>
            <Link href="/dashboard" className="btn-primary" style={{ textDecoration: 'none' }}>Go to Dashboard</Link>
          </div>
        ) : (
          <AISelfHealing monitors={monitors} />
        )}
      </main>
    </div>
  )
}
