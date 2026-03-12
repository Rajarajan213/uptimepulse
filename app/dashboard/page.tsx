'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Monitor, Heartbeat } from '@/lib/supabase'
import { Activity, Plus, LogOut, RefreshCw, Globe, Zap, TrendingUp } from 'lucide-react'
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
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={18} color="white" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700 }}>Uptime<span className="gradient-text">Pulse</span></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{userEmail}</span>
            <button id="refresh-btn" onClick={handleRefresh} className="btn-secondary" style={{ padding: '8px 12px' }}>
              <RefreshCw size={14} style={{ animation: refreshing ? 'spin-slow 0.8s linear infinite' : 'none' }} />
            </button>
            <button id="add-monitor-btn" className="btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add Monitor
            </button>
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: '8px 12px' }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px' }}>
        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total Monitors', value: monitors.length, icon: <Globe size={20} />, color: '#3b82f6' },
            { label: 'Services Up', value: upCount, icon: <Activity size={20} />, color: '#22c55e' },
            { label: 'Services Down', value: downCount, icon: <Zap size={20} />, color: '#ef4444' },
            { label: 'Avg Uptime (24h)', value: avgUptime !== null ? `${avgUptime}%` : 'N/A', icon: <TrendingUp size={20} />, color: '#8b5cf6' },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${stat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, flexShrink: 0 }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{loading && typeof stat.value === 'number' ? '—' : stat.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Monitors Grid */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Monitors</h2>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Auto-refreshes every 30s</span>
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
