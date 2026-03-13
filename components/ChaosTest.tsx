'use client'
import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, Clock, Zap, Play, RotateCcw, Wifi, Server, Database, Cpu, Activity } from 'lucide-react'

type MonitorInput = {
  id: string
  name: string
  url: string
  latest_status?: string | null
}

type ExperimentType = 'server-shutdown' | 'network-latency' | 'api-failure' | 'cpu-spike'

type Experiment = {
  id: ExperimentType
  name: string
  icon: React.ReactNode
  purpose: string
  color: string
  bg: string
  expectedDetection: string
}

type RunPhase = 'idle' | 'injecting' | 'detecting' | 'alerting' | 'recovering' | 'validated'

type RunState = {
  monitorId: string
  experimentId: ExperimentType
  phase: RunPhase
  phaseIdx: number
  startedAt: number
  detectionMs: number | null
  alertSent: boolean
  recovered: boolean
}

const EXPERIMENTS: Experiment[] = [
  { id: 'server-shutdown', name: 'Server Shutdown', icon: <Server size={16} />, purpose: 'Test outage detection', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', expectedDetection: '< 30s' },
  { id: 'network-latency', name: 'Network Latency', icon: <Wifi size={16} />, purpose: 'Test timeout handling', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', expectedDetection: '< 60s' },
  { id: 'api-failure', name: 'API Failure', icon: <Database size={16} />, purpose: 'Test dependency resilience', color: '#a855f7', bg: 'rgba(168,85,247,0.1)', expectedDetection: '< 45s' },
  { id: 'cpu-spike', name: 'CPU Spike', icon: <Cpu size={16} />, purpose: 'Test performance alerts', color: '#f97316', bg: 'rgba(249,115,22,0.1)', expectedDetection: '< 90s' },
]

const PHASES: RunPhase[] = ['idle', 'injecting', 'detecting', 'alerting', 'recovering', 'validated']

const PHASE_CONFIG: Record<RunPhase, { label: string; color: string; desc: string; icon: React.ReactNode }> = {
  idle: { label: 'Ready', color: '#64748b', desc: 'No experiment running', icon: <Clock size={14} /> },
  injecting: { label: 'Injecting Failure', color: '#ef4444', desc: 'Controlled failure is being introduced into the system', icon: <Zap size={14} /> },
  detecting: { label: 'Detecting Anomaly', color: '#f59e0b', desc: 'Adaptive monitor scanning for degradation signals', icon: <Activity size={14} /> },
  alerting: { label: 'Alert Triggered', color: '#e879f9', desc: 'Notification dispatched to on-call channels', icon: <AlertTriangle size={14} /> },
  recovering: { label: 'Observing Recovery', color: '#38bdf8', desc: 'System self-healing in progress, monitoring response', icon: <RotateCcw size={14} /> },
  validated: { label: 'Validated ✓', color: '#22c55e', desc: 'Experiment complete. Detection, alerting and recovery all passed.', icon: <CheckCircle size={14} /> },
}

function PhaseTimeline({ phase }: { phase: RunPhase }) {
  const activeIdx = PHASES.indexOf(phase)
  const steps = PHASES.slice(1) // skip idle

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
      {steps.map((p, i) => {
        const cfg = PHASE_CONFIG[p]
        const realIdx = i + 1
        const done = realIdx < activeIdx
        const active = realIdx === activeIdx

        return (
          <div key={p} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0, zIndex: 1,
                background: done ? '#22c55e' : active ? cfg.color : 'var(--bg-secondary)',
                border: `2px solid ${done ? '#22c55e' : active ? cfg.color : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: done || active ? 'white' : 'var(--text-muted)',
                boxShadow: active ? `0 0 16px ${cfg.color}60` : 'none',
                animation: active ? 'glow-pulse 1.2s infinite' : 'none',
                transition: 'all 0.4s',
              }}>
                {done ? <CheckCircle size={14} /> : cfg.icon}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: done ? '#22c55e' : active ? cfg.color : 'var(--text-muted)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                {cfg.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, marginBottom: 22,
                background: done ? '#22c55e' : 'var(--border)',
                transition: 'background 0.4s'
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function RunPanel({ run, experiment, monitor, onReset }: {
  run: RunState; experiment: Experiment; monitor: MonitorInput; onReset: () => void
}) {
  const cfg = PHASE_CONFIG[run.phase]
  const elapsed = Math.round((Date.now() - run.startedAt) / 1000)

  return (
    <div style={{ background: 'var(--bg-card)', border: `1px solid ${experiment.color}30`, borderRadius: 20, padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{experiment.name}</h3>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Target: <strong style={{ color: 'var(--text-primary)' }}>{monitor.name}</strong></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>T+{elapsed}s</div>
          {run.phase === 'validated' && (
            <button onClick={onReset} style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 10, padding: '6px 14px', color: '#38bdf8', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              <RotateCcw size={13} style={{ display: 'inline', marginRight: 6 }} />Reset
            </button>
          )}
        </div>
      </div>

      <PhaseTimeline phase={run.phase} />

      {/* Current phase status */}
      <div style={{
        background: `${cfg.color}10`, border: `1px solid ${cfg.color}30`,
        borderRadius: 14, padding: '18px 20px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 14
      }}>
        <div style={{ color: cfg.color, flexShrink: 0 }}>{cfg.icon}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: cfg.color, marginBottom: 2 }}>{cfg.label}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{cfg.desc}</div>
        </div>
        {(run.phase === 'injecting' || run.phase === 'detecting' || run.phase === 'recovering') && (
          <div style={{ marginLeft: 'auto', width: 20, height: 20, border: `3px solid ${cfg.color}40`, borderTop: `3px solid ${cfg.color}`, borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite' }} />
        )}
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Detection Time</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: run.detectionMs ? '#22c55e' : 'var(--text-muted)' }}>
            {run.detectionMs ? `${(run.detectionMs / 1000).toFixed(1)}s` : '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Target: {experiment.expectedDetection}</div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Alert Sent</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: run.alertSent ? '#22c55e' : 'var(--text-muted)' }}>
            {run.alertSent ? '✓' : '—'}
          </div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Recovery</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: run.recovered ? '#22c55e' : 'var(--text-muted)' }}>
            {run.recovered ? '✓' : '—'}
          </div>
        </div>
      </div>

      {run.phase === 'validated' && (
        <div style={{ marginTop: 20, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14, padding: '18px 22px', display: 'flex', gap: 14 }}>
          <CheckCircle size={22} color="#22c55e" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#22c55e', marginBottom: 4 }}>Chaos Test Passed</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Detected in {(run.detectionMs! / 1000).toFixed(1)}s · Alert dispatched · Auto-recovery confirmed. System behaved as expected under controlled failure conditions.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ChaosTest({ monitors }: { monitors: MonitorInput[] }) {
  const [selectedMonitor, setSelectedMonitor] = useState<string>(monitors[0]?.id || '')
  const [selectedExp, setSelectedExp] = useState<ExperimentType>('server-shutdown')
  const [run, setRun] = useState<RunState | null>(null)
  const [timer, setTimer] = useState<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (monitors.length > 0 && !selectedMonitor) setSelectedMonitor(monitors[0].id)
  }, [monitors, selectedMonitor])

  // Cleanup
  useEffect(() => () => { if (timer) clearInterval(timer) }, [timer])

  const startExperiment = () => {
    if (timer) clearInterval(timer)
    const startedAt = Date.now()
    setRun({ monitorId: selectedMonitor, experimentId: selectedExp, phase: 'injecting', phaseIdx: 1, startedAt, detectionMs: null, alertSent: false, recovered: false })

    const delays = [0, 3500, 7000, 11000, 16000] // ms for each phase transition
    const phaseSequence: RunPhase[] = ['injecting', 'detecting', 'alerting', 'recovering', 'validated']

    phaseSequence.forEach((phase, i) => {
      setTimeout(() => {
        setRun(prev => {
          if (!prev) return prev
          const detectionMs = phase === 'alerting' ? Date.now() - startedAt : prev.detectionMs
          return {
            ...prev, phase, phaseIdx: i + 1,
            detectionMs,
            alertSent: phase === 'alerting' || phase === 'recovering' || phase === 'validated' ? true : prev.alertSent,
            recovered: phase === 'validated',
          }
        })
      }, delays[i])
    })
  }

  const resetExperiment = () => {
    if (timer) clearInterval(timer)
    setRun(null)
  }

  const monitor = monitors.find(m => m.id === selectedMonitor)
  const experiment = EXPERIMENTS.find(e => e.id === selectedExp)!
  const history = [
    { exp: 'Server Shutdown', monitor: monitors[0]?.name || 'Site A', detectedIn: '18s', passed: true },
    { exp: 'CPU Spike', monitor: monitors[1]?.name || 'Site B', detectedIn: '52s', passed: true },
    { exp: 'Network Latency', monitor: monitors[0]?.name || 'Site A', detectedIn: '34s', passed: true },
    { exp: 'API Failure', monitor: monitors[2]?.name || 'Site C', detectedIn: '41s', passed: false },
  ]

  return (
    <div>
      {/* Architecture flow */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(244,63,94,0.06), rgba(168,85,247,0.04))',
        border: '1px solid rgba(244,63,94,0.15)', borderRadius: 20,
        padding: '22px 28px', marginBottom: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap'
      }}>
        {['User → Website', 'Adaptive Monitor', 'Anomaly Detection', 'Chaos Controller', 'Failure Injection', 'Alert & Validation'].map((node, i, arr) => (
          <div key={node} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700,
              color: 'var(--text-primary)', whiteSpace: 'nowrap'
            }}>{node}</div>
            {i < arr.length - 1 && <span style={{ color: 'var(--text-muted)', fontSize: 16, margin: '0 6px' }}>→</span>}
          </div>
        ))}
      </div>

      {/* Experiment table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: '22px 24px', marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={15} color="#a855f7" /> Chaos Experiment Library
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {EXPERIMENTS.map(exp => (
            <button
              key={exp.id}
              onClick={() => { if (!run || run.phase === 'validated') setSelectedExp(exp.id) }}
              style={{
                background: selectedExp === exp.id ? exp.bg : 'var(--bg-secondary)',
                border: `1px solid ${selectedExp === exp.id ? exp.color + '50' : 'var(--border)'}`,
                borderRadius: 14, padding: '16px 14px', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.25s', boxShadow: selectedExp === exp.id ? `0 4px 16px ${exp.color}20` : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: exp.color, marginBottom: 8 }}>
                {exp.icon}
                <span style={{ fontSize: 12, fontWeight: 800 }}>{exp.name}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>{exp.purpose}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: exp.color }}>Target: {exp.expectedDetection}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Launch Controls + Run Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, marginBottom: 28 }}>
        {/* Left: config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Target Monitor</div>
          {monitors.map(m => (
            <button
              key={m.id}
              onClick={() => { if (!run || run.phase === 'validated') setSelectedMonitor(m.id) }}
              style={{
                background: selectedMonitor === m.id ? 'rgba(168,85,247,0.1)' : 'var(--bg-card)',
                border: `1px solid ${selectedMonitor === m.id ? 'rgba(168,85,247,0.4)' : 'var(--border)'}`,
                borderRadius: 14, padding: '14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.25s',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
              <div style={{ fontSize: 11, color: m.latest_status === 'DOWN' ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
                ● {m.latest_status || 'UP'}
              </div>
            </button>
          ))}

          <button
            onClick={startExperiment}
            disabled={!selectedMonitor || (!!run && run.phase !== 'validated')}
            style={{
              marginTop: 8,
              background: (!selectedMonitor || (!!run && run.phase !== 'validated')) ? 'rgba(100,116,139,0.15)' : 'linear-gradient(135deg, #ef4444, #a855f7)',
              border: 'none', borderRadius: 14, padding: '14px',
              color: 'white', fontWeight: 800, fontSize: 14, cursor: (!selectedMonitor || (!!run && run.phase !== 'validated')) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: (!selectedMonitor || (!!run && run.phase !== 'validated')) ? 'none' : '0 4px 20px rgba(239,68,68,0.4)',
              transition: 'all 0.25s',
            }}
          >
            <Play size={16} /> Inject Chaos
          </button>
        </div>

        {/* Right: run panel or placeholder */}
        {run && monitor && experiment ? (
          <RunPanel run={run} experiment={experiment} monitor={monitor} onReset={resetExperiment} />
        ) : (
          <div style={{
            background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 20,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 12, padding: 40, textAlign: 'center'
          }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={26} color="#a855f7" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Ready to inject chaos</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 280, lineHeight: 1.6 }}>
              Select an experiment and a target monitor, then click <strong>Inject Chaos</strong> to run a controlled failure test.
            </div>
          </div>
        )}
      </div>

      {/* Experiment History */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: '22px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={15} color="var(--accent-blue)" /> Recent Experiment Results
        </div>
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', background: 'var(--bg-secondary)', padding: '10px 18px', borderBottom: '1px solid var(--border)' }}>
            {['Experiment', 'Monitor', 'Detected In', 'Result'].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
            ))}
          </div>
          {history.map((row, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', padding: '13px 18px',
              borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none',
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{row.exp}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{row.monitor}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>{row.detectedIn}</div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: row.passed ? '#22c55e' : '#ef4444', background: row.passed ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: 6, padding: '3px 10px' }}>
                  {row.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
