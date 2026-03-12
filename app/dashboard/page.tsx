'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Monitor, Heartbeat } from '@/lib/supabase'
import { Activity, Plus, LogOut, RefreshCw, Globe, Zap, TrendingUp, Shield, Cpu, Users, AlertTriangle, GitFork, ChevronRight, Trophy } from 'lucide-react'
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
    const interval = setInterval(fetchMonitors, 30000)
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
  const avgResponse = monitors.length > 0
    ? Math.round(monitors.reduce((a, m) => a + (m.avg_response_time ?? 0), 0) / monitors.length)
    : null

  const statTiles = [
    {
      cls: 'stat-tile-green',
      icon: '▲',
      label: 'Up Sites',
      value: loading ? '—' : upCount,
      sub: 'ONLINE',
    },
    {
      cls: 'stat-tile-red',
      icon: '▼',
      label: 'Down Sites',
      value: loading ? '—' : downCount,
      sub: 'OFFLINE',
    },
    {
      cls: 'stat-tile-amber',
      icon: '⚡',
      label: 'Avg Response',
      value: loading ? '—' : avgResponse !== null ? `${avgResponse}ms` : '—',
      sub: 'SPEED',
    },
    {
      cls: 'stat-tile-purple',
      icon: '🛡',
      label: 'Uptime',
      value: loading ? '—' : avgUptime !== null ? `${avgUptime}%` : '—',
      sub: 'PAST 24H',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      
      {/* ── Lively Scene Background ── */}
      <div className="scene-bg">
        <div className="cloud cloud-1" />
        <div className="cloud cloud-2" />
        <div className="cloud cloud-3" />
        <div className="cloud cloud-4" />
        <div className="orb orb-blue" />
        <div className="orb orb-purple" />
        <div className="orb orb-cyan" />
        <div className="orb orb-green" />
        <div className="data-stream-layer">
          {[10, 30, 52, 68, 85].map((top, i) => (
            <div key={i} className="data-stream" style={{
              top: `${top}%`, width: `${160 + i * 50}px`,
              animationDelay: `${i * 2}s`,
              animationDuration: `${8 + i}s`
            }} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <header style={{
          background: 'rgba(4, 8, 28, 0.78)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderBottom: '1px solid rgba(120,160,255,0.14)',
          padding: '0 32px', position: 'sticky', top: 0, zIndex: 40
        }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 13,
                background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(56,189,248,0.4)'
              }}>
                <Activity size={22} color="white" />
              </div>
              <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', color: 'white' }}>
                Uptime<span className="gradient-text">Pulse</span>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                padding: '6px 16px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 100, border: '1px solid rgba(120,160,255,0.18)'
              }}>
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

        <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px' }}>

          {/* ── Welcome ── */}
          <div style={{ marginBottom: 36 }} className="fade-in">
            <h1 style={{
              fontSize: 30, fontWeight: 900, marginBottom: 8,
              letterSpacing: '-0.5px', color: 'white',
              textShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}>
              Here's how things look today 👋
            </h1>
            <p style={{ color: 'rgba(180,210,255,0.75)', fontSize: 16, fontWeight: 300 }}>
              A quick overview of all the places we're watching for you.
            </p>
          </div>

          {/* ── Stat Tiles ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 52 }}>
            {statTiles.map((tile, i) => (
              <div key={tile.label} className={`stat-tile ${tile.cls} fade-in`} style={{ animationDelay: `${i * 0.07}s` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>{tile.icon}</span>
                  <span className="tile-label">{tile.label}</span>
                </div>
                <div className="tile-value">{tile.value}</div>
                <div className="tile-sub">{tile.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Monitors grid ── */}
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', color: 'white' }}>
              🌐 Your Monitored Sites
            </h2>
            <span style={{
              fontSize: 12, background: 'rgba(56,189,248,0.08)',
              border: '1px solid rgba(56,189,248,0.2)',
              padding: '5px 12px', borderRadius: 100,
              color: 'var(--accent-cyan)', fontWeight: 600
            }}>
              Auto-refreshes every 30s
            </span>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
              {[1,2,3].map(i => (
                <div key={i} className="skeleton" style={{ height: 200, borderRadius: 16 }} />
              ))}
            </div>
          ) : monitors.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '80px 32px',
              background: 'rgba(10, 20, 55, 0.5)',
              backdropFilter: 'blur(16px)',
              border: '1px dashed rgba(120,160,255,0.25)',
              borderRadius: 24
            }}>
              <Globe size={52} color="var(--accent-blue)" style={{ marginBottom: 16, opacity: 0.7 }} />
              <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10, color: 'white' }}>No monitors yet</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>Add your first URL to start monitoring</p>
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

          {/* ── Intelligence Hub ── */}
          <div style={{ marginTop: 72 }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: 'var(--accent-blue)',
                  animation: 'glow-pulse 2.5s infinite',
                  boxShadow: '0 0 12px rgba(56,189,248,0.6)'
                }} />
                <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px', color: 'white' }}>✨ Intelligence Hub</h2>
              </div>
              <p style={{ fontSize: 15, color: 'rgba(160,190,240,0.8)' }}>
                Tools that go beyond basic uptime to keep your services running smoothly.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {[
                {
                  href: '/dashboard/gamification',
                  icon: <Trophy size={24} />,
                  gradient: 'linear-gradient(135deg, rgba(249,115,22,0.14), rgba(168,85,247,0.06))',
                  border: 'rgba(249,115,22,0.3)',
                  iconBg: 'linear-gradient(135deg, #f97316, #a855f7)',
                  title: '🎮 Reliability Game',
                  desc: 'Turn uptime into a skill. Earn XP, ranks, streaks, badges and fight downtime boss battles.',
                  badge: 'LIVE',
                  badgeColor: '#f97316',
                },
                {
                  href: '/dashboard/ai-healing',

                  icon: <Shield size={24} />,
                  gradient: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.04))',
                  border: 'rgba(16,185,129,0.25)',
                  iconBg: 'linear-gradient(135deg, #10b981, #059669)',
                  title: 'AI Self-Healing System',
                  desc: 'Your automated assistant. Detects failures and triggers automatic fixes like cache purges or DNS failovers.',
                  badge: 'Active Supervisor',
                  badgeColor: '#10b981',
                },
                {
                  href: '/dashboard/digital-twin',
                  icon: <Cpu size={24} />,
                  gradient: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(99,102,241,0.04))',
                  border: 'rgba(14,165,233,0.25)',
                  iconBg: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                  title: 'Digital Twin Simulation',
                  desc: 'A live architectural map of your setup. Watch data flow and instantly spot where bottlenecks are happening.',
                  badge: 'Live Map',
                  badgeColor: '#0ea5e9',
                },
                {
                  href: '/dashboard/rum',
                  icon: <Users size={24} />,
                  gradient: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(236,72,153,0.04))',
                  border: 'rgba(139,92,246,0.25)',
                  iconBg: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  title: 'Real User Monitoring',
                  desc: 'See exactly what your users feel. Track Core Web Vitals, load times, and geographic distribution seamlessly.',
                  badge: 'User Experience',
                  badgeColor: '#8b5cf6',
                },
                {
                  href: '/dashboard/risk-score',
                  icon: <AlertTriangle size={24} />,
                  gradient: 'linear-gradient(135deg, rgba(244,63,94,0.12), rgba(245,158,11,0.04))',
                  border: 'rgba(244,63,94,0.25)',
                  iconBg: 'linear-gradient(135deg, #f43f5e, #f59e0b)',
                  title: 'AI Website Risk Score',
                  desc: 'A unified health grade from 0–100. We analyze volatility and trends so you know exactly where you stand.',
                  badge: 'Health Grade',
                  badgeColor: '#f43f5e',
                },
                {
                  href: '/dashboard/failure-map',
                  icon: <GitFork size={24} />,
                  gradient: 'linear-gradient(135deg, rgba(244,63,94,0.08), rgba(139,92,246,0.04))',
                  border: 'rgba(139,92,246,0.25)',
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
                    borderRadius: 18,
                    padding: '22px 22px 18px',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLDivElement
                      el.style.transform = 'translateY(-4px)'
                      el.style.boxShadow = '0 16px 40px rgba(0,0,0,0.4)'
                      el.style.borderColor = f.badgeColor + '50'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLDivElement
                      el.style.transform = 'none'
                      el.style.boxShadow = 'none'
                      el.style.borderColor = f.border
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ width: 46, height: 46, borderRadius: 14, background: f.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: `0 4px 14px ${f.badgeColor}40` }}>
                        {f.icon}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: f.badgeColor, background: `${f.badgeColor}18`, border: `1px solid ${f.badgeColor}35`, borderRadius: 8, padding: '3px 10px' }}>
                        {f.badge}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'white' }}>{f.title}</h3>
                    <p style={{ fontSize: 12, color: 'rgba(170,195,240,0.85)', lineHeight: 1.75, flex: 1 }}>{f.desc}</p>
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
    </div>
  )
}
