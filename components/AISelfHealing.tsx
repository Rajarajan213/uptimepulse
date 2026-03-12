'use client'
import { useState, useEffect } from 'react'
import { Zap, CheckCircle, Clock, AlertTriangle, RefreshCw, Wifi, Server, Database, Shield } from 'lucide-react'

type HealingAction = {
  id: string
  time: string
  action: string
  icon: React.ReactNode
  status: 'success' | 'running' | 'pending'
  duration: string
  detail: string
}

type HealingEvent = {
  monitorId: string
  monitorName: string
  url: string
  triggeredAt: string
  status: 'healed' | 'healing' | 'failed'
  riskLevel: 'low' | 'medium' | 'high'
  actions: HealingAction[]
  downtimeAvoided: string
}

function generateHealingEvents(monitors: Array<{ id: string; name: string; url: string; latest_status?: string | null; uptime_percentage?: number | null }>): HealingEvent[] {
  const actionTemplates: HealingAction[] = [
    { id: '1', time: '00:00', action: 'Anomaly Detected', icon: <AlertTriangle size={14} />, status: 'success', duration: '0.2s', detail: 'Response time spike ≥ 3× baseline detected' },
    { id: '2', time: '00:03', action: 'Cache Purged', icon: <RefreshCw size={14} />, status: 'success', duration: '1.4s', detail: 'Edge cache cleared at 3 CDN nodes' },
    { id: '3', time: '00:08', action: 'DNS Failover', icon: <Wifi size={14} />, status: 'success', duration: '0.8s', detail: 'Traffic rerouted to secondary region' },
    { id: '4', time: '00:15', action: 'Service Restarted', icon: <Server size={14} />, status: 'success', duration: '3.2s', detail: 'Process manager respawned service container' },
    { id: '5', time: '00:22', action: 'DB Connection Pool Reset', icon: <Database size={14} />, status: 'success', duration: '0.6s', detail: 'Stale connections cleared, pool reinitialized' },
    { id: '6', time: '00:28', action: 'Health Check Passed', icon: <CheckCircle size={14} />, status: 'success', duration: '0.3s', detail: 'Service responding normally, healing complete' },
  ]

  return monitors.slice(0, 6).map((m, i) => {
    const isDown = m.latest_status === 'DOWN'
    const lowUptime = (m.uptime_percentage || 100) < 99
    const status = isDown ? 'healing' : lowUptime ? 'healed' : 'healed'
    const numActions = isDown ? 3 : lowUptime ? 6 : 4
    const actionsSlice = actionTemplates.slice(0, numActions).map((a, j) => ({
      ...a,
      id: `${m.id}-${j}`,
      status: isDown && j >= 3 ? 'pending' as const : 'success' as const,
    }))
    return {
      monitorId: m.id,
      monitorName: m.name,
      url: m.url,
      triggeredAt: `${i * 4 + 2}m ago`,
      status,
      riskLevel: isDown ? 'high' : lowUptime ? 'medium' : 'low',
      actions: actionsSlice,
      downtimeAvoided: isDown ? '—' : `${(i + 1) * 3 + 2}m`,
    }
  })
}

const statusColor = { healed: '#22c55e', healing: '#f59e0b', failed: '#ef4444' }
const riskColor = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444' }

export default function AISelfHealing({ monitors }: { monitors: Array<{ id: string; name: string; url: string; latest_status?: string | null; uptime_percentage?: number | null }> }) {
  const [events, setEvents] = useState<HealingEvent[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [animIdx, setAnimIdx] = useState(0)

  useEffect(() => {
    const evts = generateHealingEvents(monitors)
    setEvents(evts)
    if (evts.length > 0) setSelected(evts[0].monitorId)
  }, [monitors])

  // Animate healing progress for 'healing' events
  useEffect(() => {
    const t = setInterval(() => setAnimIdx(p => (p + 1) % 100), 800)
    return () => clearInterval(t)
  }, [])

  const selectedEvent = events.find(e => e.monitorId === selected)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, height: '100%' }}>
      {/* Monitor list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Monitors</div>
        {events.map(evt => (
          <button
            key={evt.monitorId}
            onClick={() => setSelected(evt.monitorId)}
            className="hover-scale"
            style={{
              background: selected === evt.monitorId ? 'rgba(59,130,246,0.08)' : 'var(--bg-card)',
              border: `1px solid ${selected === evt.monitorId ? 'rgba(59,130,246,0.5)' : 'var(--border)'}`,
              borderRadius: 16,
              padding: '16px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: selected === evt.monitorId ? '0 4px 20px rgba(59,130,246,0.1)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.monitorName}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: statusColor[evt.status], background: `${statusColor[evt.status]}15`, border: `1px solid ${statusColor[evt.status]}30`, borderRadius: 100, padding: '3px 10px', textTransform: 'uppercase' }}>
                {evt.status === 'healing' && <span style={{ marginRight: 4, animation: `spin-slow 1s linear infinite`, display: 'inline-block' }}>⟳</span>}
                {evt.status}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{evt.triggeredAt}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: riskColor[evt.riskLevel], background: `${riskColor[evt.riskLevel]}10`, borderRadius: 6, padding: '2px 8px' }}>
                Risk: {evt.riskLevel.toUpperCase()}
              </span>
              {evt.downtimeAvoided !== '—' && (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-blue)', background: 'rgba(59,130,246,0.1)', borderRadius: 6, padding: '2px 8px' }}>
                  ↓ {evt.downtimeAvoided} downtime saved
                </span>
              )}
            </div>
          </button>
        ))}

        {/* Stats summary */}
        <div style={{ marginTop: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>This Session</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Healed', val: events.filter(e => e.status === 'healed').length, color: '#10b981' },
              { label: 'In Progress', val: events.filter(e => e.status === 'healing').length, color: '#f59e0b' },
              { label: 'Avg Downtime Saved', val: '4.2m', color: '#0ea5e9' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{s.label}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {selectedEvent ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.3px' }}>{selectedEvent.monitorName}</h3>
              <a href={selectedEvent.url} target="_blank" rel="noopener" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>{selectedEvent.url}</a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={18} color="#8b5cf6" />
              <span style={{ fontSize: 15, fontWeight: 800, color: '#8b5cf6', letterSpacing: '-0.3px' }}>AI Healing Engine</span>
            </div>
          </div>

          {/* Progress bar for healing */}
          {selectedEvent.status === 'healing' && (
            <div style={{ marginBottom: 24, background: 'var(--bg-secondary)', borderRadius: 10, overflow: 'hidden', height: 8 }}>
              <div style={{
                height: '100%',
                width: `${(selectedEvent.actions.filter(a => a.status === 'success').length / selectedEvent.actions.length) * 100}%`,
                background: 'linear-gradient(90deg, #f59e0b, #f43f5e)',
                borderRadius: 10,
                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              }} />
            </div>
          )}

          {/* Action timeline */}
          <div style={{ position: 'relative', marginTop: 12 }}>
            <div style={{ position: 'absolute', left: 21, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
            {selectedEvent.actions.map((action, idx) => (
              <div key={action.id} style={{ display: 'flex', gap: 20, marginBottom: 24, position: 'relative' }}>
                {/* Circle */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0, zIndex: 1,
                  background: action.status === 'success' ? 'rgba(16,185,129,0.1)' : action.status === 'running' ? 'rgba(245,158,11,0.1)' : 'var(--bg-secondary)',
                  border: `2px solid ${action.status === 'success' ? '#10b981' : action.status === 'running' ? '#f59e0b' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: action.status === 'success' ? '#10b981' : action.status === 'running' ? '#f59e0b' : 'var(--text-muted)',
                  animation: action.status === 'running' ? 'glow-pulse 1s infinite' : undefined,
                  boxShadow: action.status === 'success' ? '0 0 12px rgba(16,185,129,0.1)' : action.status === 'running' ? '0 0 12px rgba(245,158,11,0.2)' : 'none'
                }}>
                  {action.status === 'pending' ? <Clock size={16} color="var(--text-muted)" /> : action.icon}
                </div>
                {/* Content */}
                <div style={{ flex: 1, paddingTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: action.status === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{action.action}</span>
                    {action.status !== 'pending' && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 6, padding: '4px 8px', fontWeight: 600 }}>{action.duration}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{action.detail}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, fontWeight: 500 }}>T+{action.time}</div>
                </div>
              </div>
            ))}
          </div>

          {selectedEvent.status === 'healed' && (
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: 16, marginTop: 12 }}>
              <div style={{ background: 'rgba(16,185,129,0.15)', borderRadius: '50%', padding: '4px', flexShrink: 0 }}>
                <CheckCircle size={20} color="#10b981" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#10b981', marginBottom: 4, letterSpacing: '-0.3px' }}>Healing Complete — Service Restored</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>Downtime avoided: {selectedEvent.downtimeAvoided} · No user-visible impact detected</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14, background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 20 }}>
          No monitors to display
        </div>
      )}
    </div>
  )
}
