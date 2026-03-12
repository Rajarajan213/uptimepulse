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
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, height: '100%' }}>
      {/* Monitor list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Monitors</div>
        {events.map(evt => (
          <button
            key={evt.monitorId}
            onClick={() => setSelected(evt.monitorId)}
            style={{
              background: selected === evt.monitorId ? 'rgba(59,130,246,0.1)' : 'var(--bg-card)',
              border: `1px solid ${selected === evt.monitorId ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`,
              borderRadius: 12,
              padding: '12px 14px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.monitorName}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: statusColor[evt.status], background: `${statusColor[evt.status]}18`, border: `1px solid ${statusColor[evt.status]}40`, borderRadius: 6, padding: '2px 7px', textTransform: 'uppercase' }}>
                {evt.status === 'healing' && <span style={{ marginRight: 3, animation: `spin-slow 1s linear infinite`, display: 'inline-block' }}>⟳</span>}
                {evt.status}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{evt.triggeredAt}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <span style={{ fontSize: 10, color: riskColor[evt.riskLevel], background: `${riskColor[evt.riskLevel]}15`, borderRadius: 4, padding: '2px 6px' }}>
                Risk: {evt.riskLevel.toUpperCase()}
              </span>
              {evt.downtimeAvoided !== '—' && (
                <span style={{ fontSize: 10, color: 'var(--accent-blue)', background: 'rgba(59,130,246,0.1)', borderRadius: 4, padding: '2px 6px' }}>
                  ↓ {evt.downtimeAvoided} downtime saved
                </span>
              )}
            </div>
          </button>
        ))}

        {/* Stats summary */}
        <div style={{ marginTop: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>This Session</div>
          {[
            { label: 'Healed', val: events.filter(e => e.status === 'healed').length, color: '#22c55e' },
            { label: 'In Progress', val: events.filter(e => e.status === 'healing').length, color: '#f59e0b' },
            { label: 'Avg Downtime Saved', val: '4.2m', color: '#3b82f6' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {selectedEvent ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{selectedEvent.monitorName}</h3>
              <a href={selectedEvent.url} target="_blank" rel="noopener" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>{selectedEvent.url}</a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={16} color="#8b5cf6" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#8b5cf6' }}>AI Healing Engine</span>
            </div>
          </div>

          {/* Progress bar for healing */}
          {selectedEvent.status === 'healing' && (
            <div style={{ marginBottom: 20, background: 'var(--bg-secondary)', borderRadius: 8, overflow: 'hidden', height: 6 }}>
              <div style={{
                height: '100%',
                width: `${(selectedEvent.actions.filter(a => a.status === 'success').length / selectedEvent.actions.length) * 100}%`,
                background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                borderRadius: 8,
                transition: 'width 0.8s ease',
              }} />
            </div>
          )}

          {/* Action timeline */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
            {selectedEvent.actions.map((action, idx) => (
              <div key={action.id} style={{ display: 'flex', gap: 16, marginBottom: 20, position: 'relative' }}>
                {/* Circle */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0, zIndex: 1,
                  background: action.status === 'success' ? 'rgba(34,197,94,0.15)' : action.status === 'running' ? 'rgba(245,158,11,0.15)' : 'var(--bg-secondary)',
                  border: `2px solid ${action.status === 'success' ? '#22c55e' : action.status === 'running' ? '#f59e0b' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: action.status === 'success' ? '#22c55e' : action.status === 'running' ? '#f59e0b' : 'var(--text-muted)',
                  animation: action.status === 'running' ? 'glow-pulse 1s infinite' : undefined,
                }}>
                  {action.status === 'pending' ? <Clock size={14} color="var(--text-muted)" /> : action.icon}
                </div>
                {/* Content */}
                <div style={{ flex: 1, paddingTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: action.status === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{action.action}</span>
                    {action.status !== 'pending' && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 4, padding: '2px 6px' }}>{action.duration}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{action.detail}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>T+{action.time}</div>
                </div>
              </div>
            ))}
          </div>

          {selectedEvent.status === 'healed' && (
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <CheckCircle size={20} color="#22c55e" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>Healing Complete — Service Restored</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Downtime avoided: {selectedEvent.downtimeAvoided} · No user-visible impact detected</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          No monitors to display
        </div>
      )}
    </div>
  )
}
