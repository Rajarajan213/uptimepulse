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
  return status === 'down' ? '#f43f5e' : status === 'degraded' ? '#f59e0b' : '#10b981'
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
      {/* Graph canvas */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 800, letterSpacing: '-0.3px' }}>Live Connection Map</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Select a node to view impact radius</span>
        </div>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
            </pattern>
            {/* Pulse gradients for down nodes */}
            {graph.nodes.filter(n => n.status === 'down').map(n => (
              <radialGradient key={`pulse-${n.id}`} id={`pulse-${n.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
              </radialGradient>
            ))}
          </defs>
          <rect width={W} height={H} fill="url(#grid)" />

          {/* Pulse rings from failing nodes */}
          {graph.nodes.filter(n => n.status === 'down').map(n => {
            const pulseR = 34 + (Math.sin(pulsePhase) + 1) * 30
            return (
              <circle key={`pulse-outer-${n.id}`}
                cx={n.x} cy={n.y} r={pulseR}
                fill="none" stroke="#f43f5e"
                strokeWidth={2.5}
                opacity={Math.max(0, 0.5 - (pulseR - 34) / 60)}
                style={{ transition: 'r 0.1s linear' }}
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
            const edgeColor = (fromDown || toDown) ? '#f43f5e' : isInBlast ? '#f59e0b' : 'rgba(255,255,255,0.06)'
            // Animated propagation packet
            const animPct = ((tick * 0.02 + i * 0.13) % 1)
            const px = from.x + (to.x - from.x) * animPct
            const py = from.y + (to.y - from.y) * animPct

            return (
              <g key={`edge-${edge.from}-${edge.to}`}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={edgeColor}
                  strokeWidth={isInBlast ? 2.5 : 2}
                  strokeDasharray={fromDown || toDown ? '6 6' : 'none'}
                  opacity={isInBlast ? 0.9 : 0.4}
                  style={{ transition: 'stroke 0.3s' }}
                />
                {(fromDown || toDown || isInBlast) && (
                  <circle cx={px} cy={py} r={3.5}
                    fill={fromDown || toDown ? '#f43f5e' : '#f59e0b'}
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
            const r = isSelected ? 32 : 24

            return (
              <g key={node.id} style={{ cursor: 'pointer', transition: 'all 0.3s' }} onClick={() => handleNodeClick(node.id)}>
                {/* Affected glow */}
                {isAffected && (
                  <circle cx={node.x} cy={node.y} r={r + 14}
                    fill={`${color}15`}
                    stroke={color}
                    strokeWidth={1.5}
                    opacity={0.7}
                    style={{ transition: 'r 0.3s, fill 0.3s' }}
                  />
                )}
                {/* Main circle */}
                <circle cx={node.x} cy={node.y} r={r}
                  fill={`${color}2A`}
                  stroke={isSelected ? '#ffffff' : color}
                  strokeWidth={isSelected ? 3 : 2.5}
                  style={{ transition: 'stroke 0.3s, r 0.3s' }}
                />
                {/* Status icon */}
                <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="central"
                  fontSize={isSelected ? 16 : 14}>
                  {node.status === 'down' ? '💥' : node.status === 'degraded' ? '⚠️' : '✅'}
                </text>
                {/* Node name */}
                <text x={node.x} y={node.y + r + 18}
                  textAnchor="middle" fontSize={11}
                  fill="rgba(255,255,255,0.8)" fontWeight="700">
                  {node.name.length > 20 ? node.name.slice(0, 19) + '…' : node.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {selectedNode ? (
          <div style={{ background: 'var(--bg-card)', border: `1px solid ${nodeColor(selectedNode.status)}40`, borderRadius: 20, padding: 24, boxShadow: `0 8px 32px ${nodeColor(selectedNode.status)}10` }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.3px' }}>{selectedNode.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, wordBreak: 'break-all', fontWeight: 500 }}>{selectedNode.url}</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: nodeColor(selectedNode.status), background: `${nodeColor(selectedNode.status)}15`, border: `1px solid ${nodeColor(selectedNode.status)}30`, borderRadius: 100, padding: '4px 12px', textTransform: 'uppercase' }}>
                {selectedNode.status}
              </span>
              {selectedNode.status === 'down' && (
                <span style={{ fontSize: 12, color: '#f43f5e', background: 'rgba(244,63,94,0.1)', borderRadius: 100, padding: '4px 12px', fontWeight: 600 }}>
                  ⚠️ Origin
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Risk Score</span>
              <strong style={{ color: selectedNode.risk > 30 ? '#f43f5e' : '#10b981', fontSize: 16, fontWeight: 800 }}>{selectedNode.risk}/100</strong>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 20, padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
            Click a node to simulate propagation paths.
          </div>
        )}

        {/* Blast radius list */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
            💥 Impact Radius ({affectedNodes.length})
          </div>
          {affectedNodes.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Select a node to see affected services</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {affectedNodes.map(n => (
                <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: nodeColor(n.status), flexShrink: 0, boxShadow: `0 0 8px ${nodeColor(n.status)}60` }} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{n.name}</span>
                  <span style={{ fontSize: 11, color: nodeColor(n.status), fontWeight: 700, textTransform: 'uppercase' }}>{n.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { color: '#10b981', label: '✅ Operational' },
              { color: '#f59e0b', label: '⚠️ Degraded' },
              { color: '#f43f5e', label: '💥 Down / Failing' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: l.color, flexShrink: 0, boxShadow: `0 0 8px ${l.color}60` }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
