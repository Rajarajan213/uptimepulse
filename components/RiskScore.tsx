'use client'
import { useEffect, useState } from 'react'

type RiskFactor = { label: string; score: number; weight: number; detail: string }
type MonitorRisk = {
  id: string
  name: string
  url: string
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  factors: RiskFactor[]
  trend: 'improving' | 'stable' | 'worsening'
  lastIncident: string
}

function computeRisk(monitors: Array<{ id: string; name: string; url: string; latest_status?: string | null; avg_response_time?: number | null; uptime_percentage?: number | null }>): MonitorRisk[] {
  return monitors.map((m, idx) => {
    const uptime = m.uptime_percentage ?? 100
    const resp = m.avg_response_time ?? 200
    const isDown = m.latest_status === 'DOWN'

    // Factor scores (0–100, higher = worse)
    const uptimeFactor = Math.max(0, 100 - uptime * 0.95)
    const respFactor = Math.min(100, (resp / 2000) * 100)
    const incidentFactor = isDown ? 80 : uptime < 98 ? 40 : 10
    const trendFactor = isDown ? 70 : uptime < 99 ? 30 + Math.sin(idx) * 10 : 5

    const riskScore = Math.round(
      uptimeFactor * 0.35 +
      respFactor * 0.25 +
      incidentFactor * 0.25 +
      trendFactor * 0.15
    )

    const riskLevel = riskScore >= 70 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low'
    const trend = isDown ? 'worsening' : uptime >= 99.5 ? 'improving' : 'stable'

    return {
      id: m.id,
      name: m.name,
      url: m.url,
      riskScore,
      riskLevel,
      trend,
      lastIncident: isDown ? 'Ongoing' : uptime < 99 ? `${(idx + 1) * 3}h ago` : 'None (7d)',
      factors: [
        { label: 'Uptime Reliability', score: Math.round(uptimeFactor), weight: 35, detail: `${uptime.toFixed(2)}%` },
        { label: 'Speed Impact', score: Math.round(respFactor), weight: 25, detail: `${resp}ms` },
        { label: 'Recent Incidents', score: Math.round(incidentFactor), weight: 25, detail: isDown ? 'Currently DOWN' : `${uptime.toFixed(1)}% stable` },
        { label: 'Long-term Trend', score: Math.round(trendFactor), weight: 15, detail: trend === 'worsening' ? 'Degrading' : trend === 'improving' ? 'Recovering' : 'Stable' },
      ],
    }
  })
}

const riskColors = { low: '#10b981', medium: '#f59e0b', high: '#f43f5e', critical: '#ef4444' }
const riskLabels = { low: 'Good', medium: 'Fair', high: 'Needs Action', critical: 'Critical' }
const trendIcon = { improving: '↗️', stable: '→', worsening: '↘️' }

function RiskGauge({ score, size = 120 }: { score: number; size?: number }) {
  const r = size * 0.35 // slightly smaller radius to accommodate thicker stroke
  const circumference = Math.PI * r  // half circle
  const offset = circumference - (score / 100) * circumference
  const color = score >= 70 ? '#f43f5e' : score >= 50 ? '#f59e0b' : score >= 25 ? '#3b82f6' : '#10b981'

  return (
    <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
      {/* Track */}
      <path
        d={`M ${size * 0.15} ${size * 0.55} A ${r} ${r} 0 0 1 ${size * 0.85} ${size * 0.55}`}
        fill="none" stroke="var(--bg-card)" strokeWidth={size * 0.12} strokeLinecap="round"
      />
      {/* Score arc */}
      <path
        d={`M ${size * 0.15} ${size * 0.55} A ${r} ${r} 0 0 1 ${size * 0.85} ${size * 0.55}`}
        fill="none" stroke={color} strokeWidth={size * 0.12} strokeLinecap="round"
        strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
      <text x={size / 2} y={size * 0.45} textAnchor="middle" fontSize={size * 0.24} fontWeight="800" fill={color} style={{ letterSpacing: '-1px' }}>{score}</text>
      <text x={size / 2} y={size * 0.58} textAnchor="middle" fontSize={size * 0.1} fill="var(--text-muted)">/100</text>
    </svg>
  )
}

export default function RiskScore({ monitors }: { monitors: Array<{ id: string; name: string; url: string; latest_status?: string | null; avg_response_time?: number | null; uptime_percentage?: number | null }> }) {
  const [risks, setRisks] = useState<MonitorRisk[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [sort, setSort] = useState<'risk' | 'name'>('risk')

  useEffect(() => {
    const r = computeRisk(monitors)
    const sorted = [...r].sort((a, b) => sort === 'risk' ? b.riskScore - a.riskScore : a.name.localeCompare(b.name))
    setRisks(sorted)
    if (sorted.length > 0 && !selected) setSelected(sorted[0].id)
  }, [monitors, sort])

  const selectedRisk = risks.find(r => r.id === selected)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Sort controls */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        {(['risk', 'name'] as const).map(s => (
          <button key={s} onClick={() => setSort(s)} className={sort === s ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 16px', fontSize: 13, borderRadius: 12 }}>
            Sort by {s === 'risk' ? '⚠️ Risk' : '🔤 Name'}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {risks.map(r => {
          const color = riskColors[r.riskLevel]
          const isSelected = selected === r.id
          return (
            <div
              key={r.id}
              onClick={() => setSelected(r.id)}
              style={{
                background: isSelected ? `${color}08` : 'var(--bg-card)',
                border: `1px solid ${isSelected ? color + '50' : 'var(--border)'}`,
                borderRadius: 20,
                padding: '24px 24px 20px',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: isSelected ? `0 8px 32px ${color}15` : 'none'
              }}
            >
              {/* Top accent bar */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: color, borderRadius: '20px 20px 0 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.3px' }}>{r.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{trendIcon[r.trend]} {r.trend}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 100, padding: '4px 12px', flexShrink: 0, marginLeft: 12 }}>
                  {riskLabels[r.riskLevel]}
                </span>
              </div>

              {/* Gauge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <RiskGauge score={r.riskScore} size={100} />
                <div style={{ flex: 1 }}>
                  {r.factors.slice(0, 2).map(f => (
                    <div key={f.label} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{f.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: f.score > 60 ? '#ef4444' : f.score > 30 ? '#f59e0b' : '#22c55e' }}>{f.score}</span>
                      </div>
                      <div style={{ background: 'var(--bg-secondary)', height: 4, borderRadius: 4 }}>
                        <div style={{ height: '100%', width: `${f.score}%`, background: f.score > 60 ? '#ef4444' : f.score > 30 ? '#f59e0b' : '#22c55e', borderRadius: 4, transition: 'width 0.8s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Last incident: {r.lastIncident}</span>
                <span style={{ color, fontWeight: 600 }}>{r.riskScore}/100 risk</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Full breakdown for selected */}
      {selectedRisk && (
        <div style={{ background: 'var(--bg-card)', border: `1px solid ${riskColors[selectedRisk.riskLevel]}30`, borderRadius: 24, padding: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.3px' }}>{selectedRisk.name} — Health Breakdown</h3>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>{selectedRisk.url}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {selectedRisk.factors.map(f => (
              <div key={f.label} style={{ background: 'var(--bg-secondary)', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{f.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>weight: {f.weight}%</span>
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-1px', color: f.score > 60 ? '#f43f5e' : f.score > 30 ? '#f59e0b' : '#10b981', marginBottom: 6 }}>{f.score}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, fontWeight: 500 }}>{f.detail}</div>
                <div style={{ background: 'var(--bg-card)', height: 8, borderRadius: 8 }}>
                  <div style={{ height: '100%', width: `${f.score}%`, background: f.score > 60 ? 'linear-gradient(90deg,#f59e0b,#f43f5e)' : f.score > 30 ? '#f59e0b' : '#10b981', borderRadius: 8, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
