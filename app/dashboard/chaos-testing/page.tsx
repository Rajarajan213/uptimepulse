'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Activity, Zap, ArrowLeft } from 'lucide-react'
import ChaosTest from '@/components/ChaosTest'
import Link from 'next/link'

type MonitorData = { id: string; name: string; url: string; latest_status?: string | null }

export default function ChaosTestingPage() {
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
        .select('status')
        .eq('monitor_id', monitor.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      return {
        id: monitor.id,
        name: monitor.name,
        url: monitor.url,
        latest_status: latest?.status || null,
      }
    }))

    setMonitors(enriched)
    setLoading(false)
  }, [router])

  useEffect(() => { fetchMonitors() }, [fetchMonitors])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <header style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '0 32px', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
              <ArrowLeft size={16} /> Dashboard
            </Link>
            <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #ef4444, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}>
                <Zap size={20} color="white" />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Chaos Testing</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Controlled failure injection & recovery validation</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,0.1)', padding: '6px 14px', borderRadius: 100, border: '1px solid rgba(239,68,68,0.2)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', animation: 'glow-pulse 2s infinite', boxShadow: '0 0 10px rgba(239,68,68,0.6)' }} />
            <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 800, letterSpacing: '0.05em' }}>LAB READY</span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1300, margin: '0 auto', padding: '40px 32px' }}>
        {/* What is Chaos Testing */}
        <div style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(168,85,247,0.04))', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 24, padding: '28px 32px', marginBottom: 32, display: 'flex', gap: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
          {[
            { icon: '💥', label: 'Inject', desc: 'Introduce controlled failures: shutdowns, latency, API errors, CPU spikes' },
            { icon: '🔍', label: 'Detect', desc: 'Verify the adaptive monitor catches the fault within target time' },
            { icon: '🔔', label: 'Alert', desc: 'Confirm alerts fire accurately and reach on-call channels' },
            { icon: '♻️', label: 'Validate', desc: 'Confirm automatic or manual recovery restores the site fully' },
          ].map(step => (
            <div key={step.label} style={{ flex: 1, textAlign: 'center', background: 'var(--bg-card)', padding: '20px', borderRadius: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{step.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.3px' }}>{step.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{step.desc}</div>
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
          <ChaosTest monitors={monitors} />
        )}
      </main>
    </div>
  )
}
