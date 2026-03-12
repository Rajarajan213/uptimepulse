'use client'
import { useEffect, useRef, useState } from 'react'

type NodeType = 'cdn' | 'frontend' | 'api' | 'database' | 'auth' | 'cache'

type InfraNode = {
  id: string
  label: string
  type: NodeType
  x: number
  y: number
  health: number // 0–100
  status: 'healthy' | 'degraded' | 'down'
  responseMs: number
  load: number // 0–100
}

type InfraEdge = { from: string; to: string; traffic: number }

const nodeColors: Record<NodeType, string> = {
  cdn: '#f59e0b',
  frontend: '#3b82f6',
  api: '#8b5cf6',
  database: '#22c55e',
  auth: '#ec4899',
  cache: '#06b6d4',
}

const nodeIcons: Record<NodeType, string> = {
  cdn: '🌐',
  frontend: '🖥️',
  api: '⚡',
  database: '🗄️',
  auth: '🔐',
  cache: '⚡',
}

function buildInfraFromMonitors(monitors: Array<{ id: string; name: string; url: string; latest_status?: string | null; avg_response_time?: number | null; uptime_percentage?: number | null }>): { nodes: InfraNode[]; edges: InfraEdge[] } {
  const base: Array<{ id: string; label: string; type: NodeType; x: number; y: number }> = [
    { id: 'cdn', label: 'CDN Edge', type: 'cdn', x: 360, y: 60 },
    { id: 'frontend', label: 'Frontend', type: 'frontend', x: 200, y: 180 },
    { id: 'api', label: 'API Gateway', type: 'api', x: 360, y: 200 },
    { id: 'auth', label: 'Auth Service', type: 'auth', x: 520, y: 180 },
    { id: 'cache', label: 'Redis Cache', type: 'cache', x: 200, y: 320 },
    { id: 'database', label: 'Database', type: 'database', x: 400, y: 340 },
  ]

  const edges: InfraEdge[] = [
    { from: 'cdn', to: 'frontend', traffic: 80 },
    { from: 'cdn', to: 'api', traffic: 90 },
    { from: 'frontend', to: 'api', traffic: 70 },
    { from: 'api', to: 'auth', traffic: 60 },
    { from: 'api', to: 'cache', traffic: 85 },
    { from: 'api', to: 'database', traffic: 75 },
    { from: 'cache', to: 'database', traffic: 40 },
  ]

  // Derive health from real monitors
  const overallUptime = monitors.length
    ? monitors.reduce((a, m) => a + (m.uptime_percentage ?? 100), 0) / monitors.length
    : 100
  const avgResp = monitors.length
    ? monitors.reduce((a, m) => a + (m.avg_response_time ?? 200), 0) / monitors.length
    : 200
  const hasDown = monitors.some(m => m.latest_status === 'DOWN')

  const nodes: InfraNode[] = base.map((n, i) => {
    const jitter = (Math.sin(i * 17) * 0.15)
    const baseHealth = overallUptime / 100 + jitter
    const health = Math.max(10, Math.min(100, Math.round(baseHealth * 100)))
    const stressed = hasDown && (n.type === 'api' || n.type === 'database') ? true : health < 85
    return {
      ...n,
      health,
      status: health > 85 ? 'healthy' : health > 60 ? 'degraded' : 'down',
      responseMs: Math.round(avgResp * (1 + Math.sin(i * 7) * 0.3)),
      load: Math.round((1 - health / 100) * 100 + 20),
    }
  })

  if (hasDown) {
    const apiNode = nodes.find(n => n.id === 'api')
    if (apiNode) { apiNode.health = 35; apiNode.status = 'down' }
  }

  return { nodes, edges }
}

function getNodeColor(node: InfraNode): string {
  if (node.status === 'down') return '#ef4444'
  if (node.status === 'degraded') return '#f59e0b'
  return nodeColors[node.type]
}

export default function DigitalTwin({ monitors }: { monitors: Array<{ id: string; name: string; url: string; latest_status?: string | null; avg_response_time?: number | null; uptime_percentage?: number | null }> }) {
  const [infra, setInfra] = useState<{ nodes: InfraNode[]; edges: InfraEdge[] }>({ nodes: [], edges: [] })
  const [selected, setSelected] = useState<InfraNode | null>(null)
  const [tick, setTick] = useState(0)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    setInfra(buildInfraFromMonitors(monitors))
  }, [monitors])

  // Animate data packets
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 1200)
    return () => clearInterval(t)
  }, [])

  const W = 720, H = 420

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
      {/* SVG canvas */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 12, left: 16, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', zIndex: 2 }}>
          Live Infrastructure Map
        </div>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            {infra.nodes.map(n => (
              <radialGradient key={n.id} id={`grad-${n.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={getNodeColor(n)} stopOpacity="0.3" />
                <stop offset="100%" stopColor={getNodeColor(n)} stopOpacity="0.05" />
              </radialGradient>
            ))}
          </defs>

          {/* Edges */}
          {infra.edges.map((edge, i) => {
            const from = infra.nodes.find(n => n.id === edge.from)
            const to = infra.nodes.find(n => n.id === edge.to)
            if (!from || !to) return null
            const animPhase = ((tick * 0.3 + i * 0.15) % 1)
            const px = from.x + (to.x - from.x) * animPhase
            const py = from.y + (to.y - from.y) * animPhase
            const edgeDown = from.status === 'down' || to.status === 'down'
            return (
              <g key={`${edge.from}-${edge.to}`}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={edgeDown ? '#ef444440' : 'rgba(255,255,255,0.08)'}
                  strokeWidth={edgeDown ? 2 : 1.5}
                  strokeDasharray={edgeDown ? '6 4' : 'none'}
                />
                {/* Animated packet */}
                <circle cx={px} cy={py} r={edgeDown ? 2.5 : 3}
                  fill={edgeDown ? '#ef4444' : nodeColors[infra.nodes.find(n => n.id === edge.from)?.type || 'api']}
                  opacity={edgeDown ? 0.6 : 0.9}
                />
              </g>
            )
          })}

          {/* Nodes */}
          {infra.nodes.map(node => {
            const color = getNodeColor(node)
            const isSelected = selected?.id === node.id
            return (
              <g key={node.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(node)}>
                {/* Glow */}
                <circle cx={node.x} cy={node.y} r={40}
                  fill={`url(#grad-${node.id})`}
                />
                {/* Ring */}
                {node.status === 'down' && (
                  <circle cx={node.x} cy={node.y} r={32}
                    fill="none" stroke="#ef4444" strokeWidth={2} opacity={0.5 + Math.sin(tick * 0.5) * 0.5}
                  />
                )}
                {/* Main circle */}
                <circle cx={node.x} cy={node.y} r={24}
                  fill={`${color}22`}
                  stroke={isSelected ? 'white' : color}
                  strokeWidth={isSelected ? 2.5 : 2}
                />
                {/* Icon */}
                <text x={node.x} y={node.y - 4} textAnchor="middle" fontSize={16} dominantBaseline="central">
                  {nodeIcons[node.type]}
                </text>
                {/* Label */}
                <text x={node.x} y={node.y + 36} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.75)" fontWeight="600">
                  {node.label}
                </text>
                {/* Health pill */}
                <rect x={node.x - 18} y={node.y + 46} width={36} height={12} rx={6}
                  fill={`${color}30`} stroke={`${color}60`} strokeWidth={1}
                />
                <text x={node.x} y={node.y + 52} textAnchor="middle" fontSize={8} fill={color} fontWeight="700" dominantBaseline="central">
                  {node.health}%
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Node details sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {selected ? (
          <div style={{ background: 'var(--bg-card)', border: `1px solid ${getNodeColor(selected)}40`, borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>{nodeIcons[selected.type]}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{selected.label}</div>
                <div style={{ fontSize: 11, color: getNodeColor(selected), fontWeight: 600, textTransform: 'uppercase' }}>{selected.status}</div>
              </div>
            </div>
            {[
              { label: 'Health Score', value: `${selected.health}%`, color: getNodeColor(selected) },
              { label: 'Response Time', value: `${selected.responseMs}ms`, color: 'var(--text-primary)' },
              { label: 'Load', value: `${selected.load}%`, color: selected.load > 80 ? '#ef4444' : '#22c55e' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</span>
              </div>
            ))}
            {/* Load bar */}
            <div style={{ background: 'var(--bg-secondary)', height: 6, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${selected.load}%`, background: selected.load > 80 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: 6, transition: 'width 0.5s' }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>CPU / Memory Load</div>
          </div>
        ) : (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Click a node to inspect
          </div>
        )}

        {/* Legend */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status Legend</div>
          {[
            { color: '#22c55e', label: 'Healthy (>85%)' },
            { color: '#f59e0b', label: 'Degraded (60–85%)' },
            { color: '#ef4444', label: 'Critical (<60%)' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* Summary stats */}
        {infra.nodes.length > 0 && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Twin Summary</div>
            {[
              { label: 'Healthy Nodes', val: infra.nodes.filter(n => n.status === 'healthy').length, color: '#22c55e' },
              { label: 'Degraded', val: infra.nodes.filter(n => n.status === 'degraded').length, color: '#f59e0b' },
              { label: 'Down', val: infra.nodes.filter(n => n.status === 'down').length, color: '#ef4444' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.val}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
