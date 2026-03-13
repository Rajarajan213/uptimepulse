'use client'
import { useState, useEffect, useCallback } from 'react'
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Zap, BarChart2, RefreshCw } from 'lucide-react'

type MonitorInput = {
  id: string
  name: string
  url: string
  latest_status?: string | null
  uptime_percentage?: number | null
}

type FrequencyMode = 'stable' | 'high-traffic' | 'error' | 'recovery'

type MonitorAdaptiveState = {
  id: string
  name: string
  url: string
  mode: FrequencyMode
  intervalSeconds: number
  httpCode: number
  loadTimeMs: number
  cpuUsage: number
  memoryUsage: number
  errorRate: number
  stableForMinutes: number
  history: { time: string; mode: FrequencyMode; interval: number; reason: string }[]
}

const MODE_CONFIG: Record<FrequencyMode, { label: string; color: string; bg: string; icon: React.ReactNode; intervalLabel: string; intervalSecs: number }> = {
  stable: {
    label: 'Stable & Healthy',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)',
    icon: <CheckCircle size={16} />,
    intervalLabel: '10–15 min',
    intervalSecs: 600,
  },
  'high-traffic': {
    label: 'High Traffic',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    icon: <TrendingUp size={16} />,
    intervalLabel: '1–2 min',
    intervalSecs: 90,
  },
  error: {
    label: 'Error Detected',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.1)',
    icon: <AlertTriangle size={16} />,
    intervalLabel: '10–30 sec',
    intervalSecs: 20,
  },
  recovery: {
    label: 'Recovering',
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.1)',
    icon: <RefreshCw size={16} />,
    intervalLabel: '2–5 min',
    intervalSecs: 180,
  },
}

function inferMode(m: MonitorInput, tick: number): FrequencyMode {
  const seed = m.id.charCodeAt(0) + tick
  if (m.latest_status === 'DOWN') return 'error'
  const pct = m.uptime_percentage ?? 100
  if (pct < 98) return 'recovery'
  // Simulate fluctuating conditions based on tick
  const r = ((seed * 7919) % 100)
  if (r < 15) return 'high-traffic'
  if (r < 22) return 'error'
  if (r < 30) return 'recovery'
  return 'stable'
}

function randomInRange(min: number, max: number, seed: number) {
  return Math.round(min + ((seed * 6271) % (max - min + 1)))
}

function buildState(m: MonitorInput, tick: number): MonitorAdaptiveState {
  const mode = inferMode(m, tick)
  const cfg = MODE_CONFIG[mode]
  const seed = m.id.charCodeAt(0) + tick
  const errorRate = mode === 'error' ? randomInRange(3, 15, seed) : mode === 'recovery' ? randomInRange(1, 3, seed) : randomInRange(0, 1, seed)
  const httpCode = mode === 'error' ? (seed % 2 === 0 ? 503 : 500) : 200
  const loadTimeMs = mode === 'error' ? randomInRange(3000, 8000, seed) : mode === 'high-traffic' ? randomInRange(1500, 3000, seed) : randomInRange(200, 800, seed)
  const cpuUsage = mode === 'high-traffic' ? randomInRange(65, 90, seed) : mode === 'error' ? randomInRange(80, 99, seed) : randomInRange(20, 50, seed)
  const memoryUsage = mode === 'error' ? randomInRange(75, 95, seed) : randomInRange(30, 60, seed)
  const stableForMinutes = mode === 'stable' ? randomInRange(5, 180, seed) : 0

  const historyModes: FrequencyMode[] = ['stable', 'high-traffic', 'error', 'recovery', 'stable']
  const history = historyModes.slice(0, 5).map((hm, i) => ({
    time: `${(5 - i) * 12}m ago`,
    mode: hm,
    interval: MODE_CONFIG[hm].intervalSecs,
    reason: hm === 'stable' ? 'Uptime stable >2h, reducing frequency' :
      hm === 'high-traffic' ? 'Traffic spike detected, increasing frequency' :
      hm === 'error' ? 'Error rate >2%, max frequency triggered' :
      'Service recovering, gradually normalizing',
  }))

  return {
    id: m.id,
    name: m.name,
    url: m.url,
    mode,
    intervalSeconds: cfg.intervalSecs,
    httpCode,
    loadTimeMs,
    cpuUsage,
    memoryUsage,
    errorRate,
    stableForMinutes,
    history,
  }
}

function FrequencyDial({ intervalSeconds, mode }: { intervalSeconds: number; mode: FrequencyMode }) {
  const cfg = MODE_CONFIG[mode]
  // Map interval: 20s→100%, 90s→75%, 180s→50%, 600s→15%
  const pct = Math.max(15, Math.min(100, Math.round(100 - ((intervalSeconds - 20) / 580) * 85)))
  const radius = 44
  const circ = 2 * Math.PI * radius
  const dash = (pct / 100) * circ

  return (
    <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        <circle cx={60} cy={60} r={radius} fill="none" stroke="var(--border)" strokeWidth={8} />
        <circle
          cx={60} cy={60} r={radius} fill="none"
          stroke={cfg.color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1), stroke 0.5s' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{cfg.intervalLabel}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>interval</span>
      </div>
    </div>
  )
}

function MetricBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}{label.includes('%') || label.includes('CPU') || label.includes('Mem') ? '%' : 'ms'}</span>
      </div>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color,
          borderRadius: 4, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)'
        }} />
      </div>
    </div>
  )
}

export default function AdaptiveMonitor({ monitors }: { monitors: MonitorInput[] }) {
  const [tick, setTick] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (monitors.length > 0 && !selected) setSelected(monitors[0].id)
  }, [monitors, selected])

  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 4000)
    return () => clearInterval(t)
  }, [])

  const states = monitors.map(m => buildState(m, tick))
  const selectedState = states.find(s => s.id === selected)

  const totalMonitors = states.length
  const stableCount = states.filter(s => s.mode === 'stable').length
  const errorCount = states.filter(s => s.mode === 'error').length
  const avgInterval = totalMonitors > 0 ? Math.round(states.reduce((a, s) => a + s.intervalSeconds, 0) / totalMonitors) : 0

  const summaryCards = [
    { label: 'Stable', val: stableCount, color: '#22c55e', icon: <CheckCircle size={16} /> },
    { label: 'Errors', val: errorCount, color: '#ef4444', icon: <AlertTriangle size={16} /> },
    { label: 'Avg Interval', val: `${avgInterval}s`, color: '#38bdf8', icon: <Clock size={16} /> },
    { label: 'Total Sites', val: totalMonitors, color: '#a855f7', icon: <Activity size={16} /> },
  ]

  return (
    <div>
      {/* Info Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(99,102,241,0.06))',
        border: '1px solid rgba(56,189,248,0.2)', borderRadius: 20,
        padding: '24px 28px', marginBottom: 28,
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16
      }}>
        {summaryCards.map(c => (
          <div key={c.label} style={{
            background: 'var(--bg-card)', borderRadius: 14, padding: '16px',
            border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: c.color, marginBottom: 4 }}>
              {c.icon}
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</span>
            </div>
            <span style={{ fontSize: 26, fontWeight: 900, color: c.color }}>{c.val}</span>
          </div>
        ))}
      </div>

      {/* How It Works */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18,
        padding: '20px 24px', marginBottom: 28
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart2 size={16} color="var(--accent-blue)" /> Frequency Rules (Auto-Applied)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {(Object.entries(MODE_CONFIG) as [FrequencyMode, typeof MODE_CONFIG[FrequencyMode]][]).map(([key, cfg]) => (
            <div key={key} style={{
              background: cfg.bg, borderRadius: 12, padding: '14px',
              border: `1px solid ${cfg.color}30`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: cfg.color, marginBottom: 6 }}>
                {cfg.icon}
                <span style={{ fontSize: 12, fontWeight: 700 }}>{cfg.label}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: cfg.color }}>{cfg.intervalLabel}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
        {/* Monitor list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            Monitors
          </div>
          {states.map(s => {
            const cfg = MODE_CONFIG[s.mode]
            return (
              <button
                key={s.id}
                onClick={() => setSelected(s.id)}
                style={{
                  background: selected === s.id ? `${cfg.color}10` : 'var(--bg-card)',
                  border: `1px solid ${selected === s.id ? cfg.color + '50' : 'var(--border)'}`,
                  borderRadius: 14, padding: '14px', cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.25s', boxShadow: selected === s.id ? `0 4px 20px ${cfg.color}20` : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30`, borderRadius: 100, padding: '2px 8px' }}>
                    {cfg.intervalLabel}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: cfg.color }}>
                  {cfg.icon}
                  <span style={{ fontSize: 12, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Detail Panel */}
        {selectedState ? (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 28 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{selectedState.name}</h3>
                <a href={selectedState.url} target="_blank" rel="noopener" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>{selectedState.url}</a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <FrequencyDial intervalSeconds={selectedState.intervalSeconds} mode={selectedState.mode} />
              </div>
            </div>

            {/* Mode Badge */}
            {(() => {
              const cfg = MODE_CONFIG[selectedState.mode]
              return (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: cfg.bg, border: `1px solid ${cfg.color}40`,
                  borderRadius: 100, padding: '6px 16px', marginBottom: 20
                }}>
                  <span style={{ color: cfg.color }}>{cfg.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>→ checking every <strong style={{ color: cfg.color }}>{cfg.intervalLabel}</strong></span>
                </div>
              )
            })()}

            {/* Key Metrics */}
            <div style={{
              background: 'var(--bg-secondary)', borderRadius: 14, padding: '18px 20px', marginBottom: 20,
              display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16
            }}>
              {[
                { label: 'HTTP Status', val: selectedState.httpCode, color: selectedState.httpCode === 200 ? '#22c55e' : '#ef4444' },
                { label: 'Error Rate', val: `${selectedState.errorRate}%`, color: selectedState.errorRate > 2 ? '#ef4444' : '#22c55e' },
                { label: 'Stable For', val: selectedState.mode === 'stable' ? `${selectedState.stableForMinutes}m` : '—', color: '#38bdf8' },
              ].map(item => (
                <div key={item.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: item.color }}>{item.val}</div>
                </div>
              ))}
            </div>

            {/* Metric Bars */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Live Metrics
              </div>
              <MetricBar label="Page Load Time" value={selectedState.loadTimeMs} max={8000} color={selectedState.loadTimeMs > 3000 ? '#ef4444' : selectedState.loadTimeMs > 1500 ? '#f59e0b' : '#22c55e'} />
              <MetricBar label="CPU Usage" value={selectedState.cpuUsage} max={100} color={selectedState.cpuUsage > 80 ? '#ef4444' : selectedState.cpuUsage > 60 ? '#f59e0b' : '#22c55e'} />
              <MetricBar label="Memory Usage" value={selectedState.memoryUsage} max={100} color={selectedState.memoryUsage > 80 ? '#ef4444' : '#22c55e'} />
            </div>

            {/* Decision History */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={13} /> Adaptive Decision Log
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedState.history.map((h, i) => {
                  const cfg = MODE_CONFIG[h.mode]
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      background: i === 0 ? cfg.bg : 'var(--bg-secondary)',
                      borderRadius: 12, padding: '12px 16px',
                      border: `1px solid ${i === 0 ? cfg.color + '30' : 'var(--border)'}`
                    }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, minWidth: 50 }}>{h.time}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: cfg.color, background: `${cfg.color}15`, borderRadius: 6, padding: '2px 10px', whiteSpace: 'nowrap' }}>
                        {h.interval}s
                      </span>
                      <span style={{ fontSize: 12, color: i === 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{h.reason}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 20, color: 'var(--text-muted)', fontSize: 14 }}>
            Select a monitor to view adaptive details
          </div>
        )}
      </div>

      {/* Pseudocode Logic */}
      <div style={{
        marginTop: 28, background: 'rgba(14,26,64,0.6)', border: '1px solid rgba(56,189,248,0.18)',
        borderRadius: 18, padding: '22px 26px'
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-blue)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={15} /> Monitoring Decision Logic
        </div>
        <pre style={{
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 13,
          color: 'rgba(180,210,255,0.85)', lineHeight: 1.85, margin: 0
        }}>
{`while (monitoring):
    status = checkWebsite()
    
    if status == DOWN or error_rate > 2%:
        setFrequency(10–30 seconds)   # max sensitivity
        sendAlert()
    
    elif load_time > 3s or cpu > 80%:
        setFrequency(1–2 minutes)     # high-traffic mode
    
    elif stable_for >= 2 hours:
        setFrequency(10–15 minutes)   # calm mode, save resources
    
    else:
        setFrequency(2–5 minutes)     # recovery / normalizing`}
        </pre>
      </div>
    </div>
  )
}
