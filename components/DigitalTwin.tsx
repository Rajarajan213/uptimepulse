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
  if (node.status === 'down') return '#f43f5e'
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>
      {/* SVG canvas */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, overflow: 'hidden', position: 'relative', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <div style={{ position: 'absolute', top: 16, left: 20, fontSize: 13, color: 'var(--text-primary)', fontWeight: 800, letterSpacing: '-0.3px', zIndex: 2 }}>
          Live Infrastructure Map
        </div>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            {infra.nodes.map(n => (
              <radialGradient key={n.id} id={`grad-${n.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={getNodeColor(n)} stopOpacity="0.4" />
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
                  stroke={edgeDown ? 'rgba(244, 63, 94, 0.4)' : 'rgba(255,255,255,0.06)'}
                  strokeWidth={edgeDown ? 3 : 2}
                  strokeDasharray={edgeDown ? '6 6' : 'none'}
                />
                {/* Animated packet */}
                <circle cx={px} cy={py} r={edgeDown ? 3 : 3.5}
                  fill={edgeDown ? '#f43f5e' : nodeColors[infra.nodes.find(n => n.id === edge.from)?.type || 'api']}
                  opacity={edgeDown ? 0.7 : 0.9}
                  style={{ transition: 'cx 1.2s linear, cy 1.2s linear' }}
                />
              </g>
            )
          })}

          {/* Nodes */}
          {infra.nodes.map(node => {
            const color = getNodeColor(node)
            const isSelected = selected?.id === node.id
            return (
              <g key={node.id} style={{ cursor: 'pointer', transition: 'all 0.3s' }} onClick={() => setSelected(node)}>
                {/* Glow */}
                <circle cx={node.x} cy={node.y} r={isSelected ? 50 : 42}
                  fill={`url(#grad-${node.id})`}
                  style={{ transition: 'r 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
                {/* Ring */}
                {node.status === 'down' && (
                  <circle cx={node.x} cy={node.y} r={34}
                    fill="none" stroke="#f43f5e" strokeWidth={3} opacity={0.6 + Math.sin(tick * 0.5) * 0.4}
                  />
                )}
                {/* Main circle */}
                <circle cx={node.x} cy={node.y} r={26}
                  fill={`${color}2A`}
                  stroke={isSelected ? '#ffffff' : color}
                  strokeWidth={isSelected ? 3 : 2.5}
                  style={{ transition: 'stroke 0.3s, fill 0.3s' }}
                />
                {/* Icon */}
                <text x={node.x} y={node.y - 4} textAnchor="middle" fontSize={18} dominantBaseline="central">
                  {nodeIcons[node.type]}
                </text>
                {/* Label */}
                <text x={node.x} y={node.y + 40} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.8)" fontWeight="700">
                  {node.label}
                </text>
                {/* Health pill */}
                <rect x={node.x - 20} y={node.y + 48} width={40} height={14} rx={7}
                  fill={`${color}2A`} stroke={`${color}50`} strokeWidth={1}
                />
                <text x={node.x} y={node.y + 55} textAnchor="middle" fontSize={9} fill={color} fontWeight="800" dominantBaseline="central">
                  {node.health}%
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Node details sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {selected ? (
          <div style={{ background: 'var(--bg-card)', border: `1px solid ${getNodeColor(selected)}40`, borderRadius: 20, padding: 24, boxShadow: `0 8px 32px ${getNodeColor(selected)}10` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 28 }}>{nodeIcons[selected.type]}</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' }}>{selected.label}</div>
                <div style={{ fontSize: 12, color: getNodeColor(selected), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{selected.status}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Health Score', value: `${selected.health}%`, color: getNodeColor(selected) },
                { label: 'Response Time', value: `${selected.responseMs}ms`, color: 'var(--text-primary)' },
                { label: 'System Load', value: `${selected.load}%`, color: selected.load > 80 ? '#f43f5e' : '#10b981' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
            {/* Load bar */}
            <div style={{ marginTop: 16 }}>
              <div style={{ background: 'var(--bg-secondary)', height: 8, borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${selected.load}%`, background: selected.load > 80 ? 'linear-gradient(90deg, #f59e0b, #f43f5e)' : 'linear-gradient(90deg, #10b981, #22c55e)', borderRadius: 8, transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>CPU / Memory Utilization</div>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 20, padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
            Select a node to view its health details.
          </div>
        )}

        {/* Legend */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status Legend</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { color: '#10b981', label: 'Healthy (Optimal)' },
              { color: '#f59e0b', label: 'Degraded (Warning)' },
              { color: '#f43f5e', label: 'Critical (Action Needed)' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: l.color, boxShadow: `0 0 8px ${l.color}80` }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary stats */}
        {infra.nodes.length > 0 && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Twin Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Healthy Nodes', val: infra.nodes.filter(n => n.status === 'healthy').length, color: '#10b981' },
                { label: 'Degraded Nodes', val: infra.nodes.filter(n => n.status === 'degraded').length, color: '#f59e0b' },
                { label: 'Critical Nodes', val: infra.nodes.filter(n => n.status === 'down').length, color: '#f43f5e' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{s.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
