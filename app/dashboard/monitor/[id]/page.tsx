'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Monitor, Heartbeat, Incident } from '@/lib/supabase'
import { ArrowLeft, Activity, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react'
import ResponseTimeChart from '@/components/ResponseTimeChart'
import IncidentLog from '@/components/IncidentLog'
import { format } from 'date-fns'

type Props = { params: Promise<{ id: string }> }

export default function MonitorDetailPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const [monitor, setMonitor] = useState<Monitor | null>(null)
  const [heartbeats, setHeartbeats] = useState<Heartbeat[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'chart' | 'history' | 'incidents'>('chart')

  useEffect(() => {
    const fetchAll = async () => {
      const { data: mon } = await supabase.from('monitors').select('*').eq('id', id).single()
      if (!mon) { router.push('/dashboard'); return }
      setMonitor(mon)

      const { data: hb } = await supabase
        .from('heartbeats').select('*').eq('monitor_id', id)
        .order('created_at', { ascending: false }).limit(50)
      setHeartbeats(hb || [])

      const { data: inc } = await supabase
        .from('incidents').select('*').eq('monitor_id', id)
        .order('started_at', { ascending: false }).limit(20)
      setIncidents(inc || [])
      setLoading(false)
    }
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [id, router])

  const latestHeartbeat = heartbeats[0]
  const upCount = heartbeats.filter(h => h.status === 'UP').length
  const uptime = heartbeats.length > 0 ? Math.round((upCount / heartbeats.length) * 10000) / 100 : null
  const avgResp = heartbeats.length > 0
    ? Math.round(heartbeats.reduce((a, h) => a + (h.response_time || 0), 0) / heartbeats.length)
    : null

  const badgeUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/badge/${id}` : ''
  const copyBadge = () => {
    navigator.clipboard.writeText(`[![Status](${badgeUrl})](${window.location.href})`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--border-light)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite' }} />
    </div>
  )

  if (!monitor) return null
  const isUp = latestHeartbeat?.status === 'UP'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '0 32px', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/dashboard')} className="btn-secondary" style={{ padding: '8px 12px' }}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={16} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{monitor.name}</div>
            <a href={monitor.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              {monitor.url} <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px' }}>
        {/* Status + Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          {/* Big status */}
          <div className="card" style={{ padding: 28, gridColumn: 'span 1' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className={isUp ? 'status-dot-up' : latestHeartbeat ? 'status-dot-down' : ''} style={!latestHeartbeat ? { width: 10, height: 10, borderRadius: '50%', background: '#94a3b8' } : undefined} />
              <span style={{ fontSize: 32, fontWeight: 900, color: isUp ? 'var(--accent-green)' : latestHeartbeat ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                {latestHeartbeat?.status || 'PENDING'}
              </span>
            </div>
            {latestHeartbeat && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                HTTP {latestHeartbeat.status_code} · {format(new Date(latestHeartbeat.created_at), 'HH:mm:ss')}
              </div>
            )}
          </div>

          {[
            { label: 'Uptime (last 50)', value: uptime !== null ? `${uptime}%` : '—', color: uptime && uptime >= 99 ? 'var(--accent-green)' : 'var(--accent-yellow)' },
            { label: 'Avg Response', value: avgResp !== null ? `${avgResp}ms` : '—', color: 'var(--accent-blue)' },
            { label: 'Last Response', value: latestHeartbeat?.response_time ? `${latestHeartbeat.response_time}ms` : '—', color: 'var(--text-primary)' },
            { label: 'Check Interval', value: `${monitor.interval}s`, color: 'var(--accent-purple)' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Uptime bar (last 50 heartbeats) */}
        <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>Response History (last {Math.min(heartbeats.length, 50)} checks)</div>
          <div style={{ display: 'flex', gap: 2, height: 32, alignItems: 'center' }}>
            {[...heartbeats].reverse().slice(-50).map((h, i) => (
              <div
                key={h.id}
                title={`${h.status} · ${h.response_time}ms · ${format(new Date(h.created_at), 'HH:mm')}`}
                style={{
                  flex: 1, height: 28, borderRadius: 3, cursor: 'pointer',
                  background: h.status === 'UP' ? 'var(--accent-green)' : 'var(--accent-red)',
                  opacity: 0.7 + (i / 50) * 0.3,
                  transition: 'transform 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scaleY(1.2)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scaleY(1)')}
              />
            ))}
            {heartbeats.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet</div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            <span>Oldest</span>
            <span>Most Recent</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', borderRadius: 12, padding: 4, border: '1px solid var(--border)', width: 'fit-content' }}>
          {(['chart', 'history', 'incidents'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              background: activeTab === tab ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'transparent',
              color: activeTab === tab ? 'white' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}>
              {tab === 'chart' ? 'Response Time' : tab === 'history' ? 'Ping History' : 'Incidents'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="card" style={{ padding: '24px' }}>
          {activeTab === 'chart' && <ResponseTimeChart heartbeats={heartbeats} />}

          {activeTab === 'history' && (
            <div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Time', 'Status', 'Response Time', 'HTTP Code', 'Error'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heartbeats.map(hb => (
                      <tr key={hb.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{format(new Date(hb.created_at), 'MMM d HH:mm:ss')}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: hb.status === 'UP' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: hb.status === 'UP' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                            {hb.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{hb.response_time ? `${hb.response_time}ms` : '—'}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{hb.status_code || '—'}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--accent-red)', fontSize: 12 }}>{hb.error || '—'}</td>
                      </tr>
                    ))}
                    {heartbeats.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No ping data yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'incidents' && <IncidentLog incidents={incidents} />}
        </div>

        {/* Badge embed */}
        <div className="card" style={{ padding: 24, marginTop: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={16} color="var(--accent-purple)" />
            Embeddable Status Badge
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Embed this badge on your website or README to show live status:</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {badgeUrl && <img src={badgeUrl} alt="status badge" style={{ height: 20 }} />}
            <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, border: '1px solid var(--border)', minWidth: 0 }}>
              <code style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {`[![Status](${badgeUrl})](${monitor.url})`}
              </code>
              <button onClick={copyBadge} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--accent-green)' : 'var(--text-muted)', flexShrink: 0 }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
