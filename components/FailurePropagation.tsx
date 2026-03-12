'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

type GraphNode = {
  id: string
  name: string
  url: string
  x: number; y: number
  vx: number; vy: number
  status: 'up' | 'down' | 'degraded' | 'unknown'
  risk: number
}

type GraphEdge = { from: string; to: string; weight: number }

function buildGraph(monitors: Array<{id: string; name: string; url: string; latest_status?: string | null; uptime_percentage?: number | null}>): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const W = 680, H = 420
  const nodes: GraphNode[] = monitors.map((m, i) => {
    const angle = (i / Math.max(monitors.length, 1)) * Math.PI * 2
    const r = monitors.length > 1 ? 140 : 0
    return {
      id: m.id,
      name: m.name,
      url: m.url,
      x: W / 2 + r * Math.cos(angle),
      y: H / 2 + r * Math.sin(angle),
      vx: 0, vy: 0,
      status: m.latest_status === 'DOWN' ? 'down' : (m.uptime_percentage ?? 100) < 98 ? 'degraded' : 'up',
      risk: Math.max(0, Math.min(100, Math.round(100 - (m.uptime_percentage ?? 100)))),
    }
  })

  // Simulate dependency edges — connect monitors that share domain parts
  const edges: GraphEdge[] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = monitors[i].url.replace(/^https?:\/\//, '').split('/')[0]
      const b = monitors[j].url.replace(/^https?:\/\//, '').split('/')[0]
      const aParts = a.split('.')
      const bParts = b.split('.')
      const sharedParts = aParts.filter(p => bParts.includes(p) && p.length > 3)
      if (sharedParts.length > 0 || Math.abs(i - j) === 1) {
        edges.push({ from: nodes[i].id, to: nodes[j].id, weight: sharedParts.length > 0 ? 2 : 1 })
      }
    }
  }
  // Ensure connectivity — add hub connections for isolated monitors
  if (nodes.length > 2 && edges.length < nodes.length - 1) {
    for (let i = 1; i < nodes.length; i++) {
      const connected = edges.some(e => e.from === nodes[i].id || e.to === nodes[i].id)
      if (!connected) edges.push({ from: nodes[0].id, to: nodes[i].id, weight: 1 })
    }
  }

  return { nodes, edges }
}

function nodeColor(status: GraphNode['status']): string {
  return status === 'down' ? '#ef4444' : status === 'degraded' ? '#f59e0b' : '#22c55e'
}

// BFS to get propagation blast radius  
function getBlastRadius(nodeId: string, edges: GraphEdge[], nodes: GraphNode[]): Set<string> {
  const affected = new Set<string>()
  const queue = [nodeId]
  while (queue.length > 0) {
    const curr = queue.shift()!
    edges.filter(e => e.from === curr || e.to === curr).forEach(e => {
      const neighbor = e.from === curr ? e.to : e.from
      if (!affected.has(neighbor)) {
        affected.add(neighbor)
        queue.push(neighbor)
      }
    })
  }
  return affected
}

export default function FailurePropagation({ monitors }: { monitors: Array<{id: string; name: string; url: string; latest_status?: string | null; uptime_percentage?: number | null}> }) {
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] })
  const [selected, setSelected] = useState<string | null>(null)
  const [blastRadius, setBlastRadius] = useState<Set<string>>(new Set())
  const [tick, setTick] = useState(0)
  const [pulsePhase, setPulsePhase] = useState(0)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const g = buildGraph(monitors)
    setGraph(g)
    const downNode = g.nodes.find(n => n.status === 'down')
    if (downNode) {
      setSelected(downNode.id)
      setBlastRadius(getBlastRadius(downNode.id, g.edges, g.nodes))
    }
  }, [monitors])

  useEffect(() => {
    const t = setInterval(() => {
      setTick(p => p + 1)
      setPulsePhase(p => (p + 0.08) % (Math.PI * 2))
    }, 80)
    return () => clearInterval(t)
  }, [])

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelected(nodeId)
    setBlastRadius(getBlastRadius(nodeId, graph.edges, graph.nodes))
  }, [graph])

  const W = 680, H = 420
  const selectedNode = graph.nodes.find(n => n.id === selected)
  const affectedNodes = graph.nodes.filter(n => blastRadius.has(n.id))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
      {/* Graph canvas */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Failure Propagation Graph</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click a node to simulate blast radius</span>
        </div>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1"/>
            </pattern>
            {/* Pulse gradients for down nodes */}
            {graph.nodes.filter(n => n.status === 'down').map(n => (
              <radialGradient key={`pulse-${n.id}`} id={`pulse-${n.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </radialGradient>
            ))}
          </defs>
          <rect width={W} height={H} fill="url(#grid)" />

          {/* Pulse rings from failing nodes */}
          {graph.nodes.filter(n => n.status === 'down').map(n => {
            const pulseR = 30 + (Math.sin(pulsePhase) + 1) * 30
            return (
              <circle key={`pulse-outer-${n.id}`}
                cx={n.x} cy={n.y} r={pulseR}
                fill="none" stroke="#ef4444"
                strokeWidth={2}
                opacity={Math.max(0, 0.5 - (pulseR - 30) / 60)}
              />
            )
          })}

          {/* Edges */}
          {graph.edges.map((edge, i) => {
            const from = graph.nodes.find(n => n.id === edge.from)
            const to = graph.nodes.find(n => n.id === edge.to)
            if (!from || !to) return null
            const isInBlast = selected && (blastRadius.has(edge.from) || blastRadius.has(edge.to)) && (edge.from === selected || edge.to === selected || blastRadius.has(edge.from) && blastRadius.has(edge.to))
            const fromDown = from.status === 'down'
            const toDown = to.status === 'down'
            const edgeColor = (fromDown || toDown) ? '#ef4444' : isInBlast ? '#f59e0b' : 'rgba(255,255,255,0.08)'
            // Animated propagation packet
            const animPct = ((tick * 0.02 + i * 0.13) % 1)
            const px = from.x + (to.x - from.x) * animPct
            const py = from.y + (to.y - from.y) * animPct

            return (
              <g key={`edge-${edge.from}-${edge.to}`}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={edgeColor}
                  strokeWidth={isInBlast ? 2 : 1}
                  strokeDasharray={fromDown || toDown ? '6 4' : 'none'}
                  opacity={isInBlast ? 0.8 : 0.3}
                />
                {(fromDown || toDown || isInBlast) && (
                  <circle cx={px} cy={py} r={3}
                    fill={fromDown || toDown ? '#ef4444' : '#f59e0b'}
                    opacity={0.9}
                  />
                )}
              </g>
            )
          })}

          {/* Nodes */}
          {graph.nodes.map(node => {
            const isSelected = node.id === selected
            const isAffected = blastRadius.has(node.id)
            const color = nodeColor(node.status)
            const r = isSelected ? 28 : 22

            return (
              <g key={node.id} style={{ cursor: 'pointer' }} onClick={() => handleNodeClick(node.id)}>
                {/* Affected glow */}
                {isAffected && (
                  <circle cx={node.x} cy={node.y} r={r + 12}
                    fill={`${color}15`}
                    stroke={color}
                    strokeWidth={1}
                    opacity={0.6}
                  />
                )}
                {/* Main circle */}
                <circle cx={node.x} cy={node.y} r={r}
                  fill={`${color}22`}
                  stroke={isSelected ? 'white' : color}
                  strokeWidth={isSelected ? 2.5 : 2}
                />
                {/* Status icon */}
                <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="central"
                  fontSize={isSelected ? 14 : 12}>
                  {node.status === 'down' ? '💥' : node.status === 'degraded' ? '⚠️' : '✅'}
                </text>
                {/* Node name */}
                <text x={node.x} y={node.y + r + 14}
                  textAnchor="middle" fontSize={9}
                  fill="rgba(255,255,255,0.7)" fontWeight="600">
                  {node.name.length > 16 ? node.name.slice(0, 15) + '…' : node.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {selectedNode ? (
          <div style={{ background: 'var(--bg-card)', border: `1px solid ${nodeColor(selectedNode.status)}40`, borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{selectedNode.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, wordBreak: 'break-all' }}>{selectedNode.url}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: nodeColor(selectedNode.status), background: `${nodeColor(selectedNode.status)}18`, border: `1px solid ${nodeColor(selectedNode.status)}40`, borderRadius: 6, padding: '3px 8px', textTransform: 'uppercase' }}>
                {selectedNode.status}
              </span>
              {selectedNode.status === 'down' && (
                <span style={{ fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.1)', borderRadius: 6, padding: '3px 8px' }}>
                  ⚠️ Origin of failure
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              Risk Score: <strong style={{ color: selectedNode.risk > 30 ? '#ef4444' : '#22c55e' }}>{selectedNode.risk}/100</strong>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Click a node to simulate failure propagation
          </div>
        )}

        {/* Blast radius list */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            💥 Blast Radius ({affectedNodes.length} services)
          </div>
          {affectedNodes.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Select a node to see affected services</div>
          ) : (
            affectedNodes.map(n => (
              <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: nodeColor(n.status), flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.name}</span>
                <span style={{ fontSize: 10, color: nodeColor(n.status), fontWeight: 600, textTransform: 'uppercase' }}>{n.status}</span>
              </div>
            ))
          )}
        </div>

        {/* Legend */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend</div>
          {[
            { color: '#22c55e', label: '✅ Operational', emoji: '' },
            { color: '#f59e0b', label: '⚠️ Degraded', emoji: '' },
            { color: '#ef4444', label: '💥 Down / Failing', emoji: '' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{l.label}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Dashed lines = degraded connections. Animated packets show live data flow.
          </div>
        </div>
      </div>
    </div>
  )
}
