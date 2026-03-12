'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Monitor, Heartbeat } from '@/lib/supabase'
import { Activity, Plus, LogOut, RefreshCw, Globe, Zap, TrendingUp, Shield, Cpu, Users, AlertTriangle, GitFork, ChevronRight } from 'lucide-react'
import AddMonitorModal from '@/components/AddMonitorModal'
import MonitorCard from '@/components/MonitorCard'

type MonitorWithStats = Monitor & {
  latest_status?: 'UP' | 'DOWN' | null
  avg_response_time?: number | null
  uptime_percentage?: number | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [monitors, setMonitors] = useState<MonitorWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  const fetchMonitors = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserEmail(user.email || '')

    const { data: monitorsData } = await supabase
      .from('monitors')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!monitorsData) { setLoading(false); return }

    // Fetch latest heartbeat + stats for each monitor
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
        .select('status, response_time')
        .eq('monitor_id', monitor.id)
        .gte('created_at', new Date(Date.now() - 86400000).toISOString())

      const upCount = last24h?.filter(h => h.status === 'UP').length || 0
      const total = last24h?.length || 0
      const uptime = total > 0 ? (upCount / total) * 100 : null
      const avgResp = last24h && last24h.length > 0 
        ? Math.round(last24h.reduce((a, h) => a + (h.response_time || 0), 0) / last24h.length) 
        : null

      return {
        ...monitor,
        latest_status: latest?.status || null,
        avg_response_time: avgResp,
        uptime_percentage: uptime !== null ? Math.round(uptime * 100) / 100 : null,
      }
    }))

    setMonitors(enriched)
    setLoading(false)
  }, [router])

  useEffect(() => {
    fetchMonitors()
    const interval = setInterval(fetchMonitors, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [fetchMonitors])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchMonitors()
    setRefreshing(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleDelete = async (id: string) => {
    await supabase.from('monitors').delete().eq('id', id)
    setMonitors(prev => prev.filter(m => m.id !== id))
  }

  const upCount = monitors.filter(m => m.latest_status === 'UP').length
  const downCount = monitors.filter(m => m.latest_status === 'DOWN').length
  const avgUptime = monitors.length > 0
    ? Math.round(monitors.reduce((a, m) => a + (m.uptime_percentage ?? 100), 0) / monitors.length * 100) / 100
    : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '0 32px', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(14,165,233,0.3)' }}>
              <Activity size={20} color="white" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>Uptime<span className="gradient-text">Pulse</span></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 100, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{userEmail}</span>
            </div>
            <button id="refresh-btn" onClick={handleRefresh} className="btn-secondary" style={{ padding: '10px', borderRadius: 12 }} title="Refresh Data">
              <RefreshCw size={16} style={{ animation: refreshing ? 'spin-slow 0.8s linear infinite' : 'none' }} />
            </button>
            <button id="add-monitor-btn" className="btn-primary" onClick={() => setShowAdd(true)} style={{ borderRadius: 12 }}>
              <Plus size={18} /> Add Site
            </button>
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: '10px', borderRadius: 12 }} title="Log out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 32px' }}>
        
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.5px' }}>Here's how things look today 👋</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, fontWeight: 300 }}>A quick overview of all the places we're watching for you.</p>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 48 }}>
          {[
            { label: 'Sites Monitored', value: monitors.length, icon: <Globe size={22} />, color: '#0ea5e9' },
            { label: 'All Good', value: upCount, icon: <Activity size={22} />, color: '#10b981' },
            { label: 'Needs Attention', value: downCount, icon: <Zap size={22} />, color: '#f43f5e' },
            { label: 'Avg Uptime (24h)', value: avgUptime !== null ? `${avgUptime}%` : '—', icon: <TrendingUp size={22} />, color: '#8b5cf6' },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, flexShrink: 0 }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{loading && typeof stat.value === 'number' ? '—' : stat.value}</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Monitors Grid */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>Your Monitored Sites</h2>
          <span style={{ fontSize: 13, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 100, color: 'var(--text-muted)', fontWeight: 500 }}>Auto-refreshes every 30s</span>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ height: 200, borderRadius: 16 }} />
            ))}
          </div>
        ) : monitors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 32px' }}>
            <Globe size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No monitors yet</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Add your first URL to start monitoring</p>
            <button id="add-first-monitor-btn" className="btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add Your First Monitor
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
            {monitors.map((monitor, i) => (
              <div key={monitor.id} className="fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <MonitorCard
                  monitor={monitor}
                  latestStatus={monitor.latest_status}
                  avgResponseTime={monitor.avg_response_time}
                  uptimePercentage={monitor.uptime_percentage}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        )}
        {/* AI Features Section */}
        <div style={{ marginTop: 64 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-blue)', animation: 'glow-pulse 2.5s infinite' }} />
              <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>✨ Intelligence Hub</h2>
            </div>
            <p style={{ fontSize: 15, color: 'var(--text-muted)' }}>Tools that go beyond basic uptime to keep your services running smoothly.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {[
              {
                href: '/dashboard/ai-healing',
                icon: <Shield size={24} />,
                gradient: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.03))',
                border: 'rgba(16,185,129,0.2)',
                iconBg: 'linear-gradient(135deg, #10b981, #059669)',
                title: 'AI Self-Healing System',
                desc: 'Your automated assistant. Detects failures and triggers automatic fixes like cache purges or DNS failovers.',
                badge: 'Active Supervisor',
                badgeColor: '#10b981',
              },
              {
                href: '/dashboard/digital-twin',
                icon: <Cpu size={24} />,
                gradient: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(99,102,241,0.03))',
                border: 'rgba(14,165,233,0.2)',
                iconBg: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                title: 'Digital Twin Simulation',
                desc: 'A live architectural map of your setup. Watch data flow and instantly spot where bottlenecks are happening.',
                badge: 'Live Map',
                badgeColor: '#0ea5e9',
              },
              {
                href: '/dashboard/rum',
                icon: <Users size={24} />,
                gradient: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(236,72,153,0.03))',
                border: 'rgba(139,92,246,0.2)',
                iconBg: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                title: 'Real User Monitoring',
                desc: 'See exactly what your users feel. Track Core Web Vitals, load times, and geographic distribution seamlessly.',
                badge: 'User Experience',
                badgeColor: '#8b5cf6',
              },
              {
                href: '/dashboard/risk-score',
                icon: <AlertTriangle size={24} />,
                gradient: 'linear-gradient(135deg, rgba(244,63,94,0.08), rgba(245,158,11,0.03))',
                border: 'rgba(244,63,94,0.2)',
                iconBg: 'linear-gradient(135deg, #f43f5e, #f59e0b)',
                title: 'AI Website Risk Score',
                desc: 'A unified health grade from 0-100. We analyze volatility and trends so you know exactly where you stand.',
                badge: 'Health Grade',
                badgeColor: '#f43f5e',
              },
              {
                href: '/dashboard/failure-map',
                icon: <GitFork size={24} />,
                gradient: 'linear-gradient(135deg, rgba(244,63,94,0.08), rgba(139,92,246,0.03))',
                border: 'rgba(139,92,246,0.2)',
                iconBg: 'linear-gradient(135deg, #f43f5e, #8b5cf6)',
                title: 'Failure Propagation Map',
                desc: 'See the blast radius of any outage. Click a service to instantly see what else might be affected downstream.',
                badge: 'Cascade Analysis',
                badgeColor: '#8b5cf6',
              },
            ].map(f => (
              <Link key={f.href} href={f.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: f.gradient,
                  border: `1px solid ${f.border}`,
                  borderRadius: 16,
                  padding: '22px 22px 18px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                  className="ai-feature-card"
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.transform = 'translateY(-2px)'
                    el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.transform = 'none'
                    el.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: f.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                      {f.icon}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: f.badgeColor, background: `${f.badgeColor}15`, border: `1px solid ${f.badgeColor}30`, borderRadius: 6, padding: '3px 8px' }}>
                      {f.badge}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>{f.title}</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, flex: 1 }}>{f.desc}</p>
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent-blue)', fontWeight: 600 }}>
                    Open feature <ChevronRight size={14} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      {showAdd && (
        <AddMonitorModal
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); fetchMonitors() }}
        />
      )}
    </div>
  )
}
