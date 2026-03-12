'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Monitor } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { ExternalLink, Trash2, ChevronRight, Clock, TrendingUp, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type Props = {
  monitor: Monitor
  latestStatus: 'UP' | 'DOWN' | null | undefined
  avgResponseTime: number | null | undefined
  uptimePercentage: number | null | undefined
  onDelete: (id: string) => void
}

export default function MonitorCard({ monitor, latestStatus, avgResponseTime, uptimePercentage, onDelete }: Props) {
  const router = useRouter()
  const [checking, setChecking] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleManualCheck = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setChecking(true)
    try {
      await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monitorId: monitor.id, url: monitor.url }),
      })
    } finally {
      setChecking(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirmDelete) { setConfirmDelete(true); return }
    await supabase.from('monitors').delete().eq('id', monitor.id)
    onDelete(monitor.id)
  }

  const statusColor = latestStatus === 'UP' ? '#22c55e' : latestStatus === 'DOWN' ? '#ef4444' : '#94a3b8'
  const uptimePct = uptimePercentage !== null && uptimePercentage !== undefined ? uptimePercentage : null

  return (
    <div
      className="card"
      style={{ padding: '24px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
      onClick={() => router.push(`/dashboard/monitor/${monitor.id}`)}
    >
      {/* Status accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: latestStatus === 'UP' ? 'linear-gradient(90deg, #22c55e, #16a34a)' : latestStatus === 'DOWN' ? 'linear-gradient(90deg, #ef4444, #dc2626)' : 'var(--border)', borderRadius: '16px 16px 0 0' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div className={latestStatus === 'UP' ? 'status-dot-up' : latestStatus === 'DOWN' ? 'status-dot-down' : ''} style={!latestStatus ? { width: 10, height: 10, borderRadius: '50%', background: '#94a3b8' } : undefined} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{monitor.name}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ExternalLink size={11} color="var(--text-muted)" />
            <a href={monitor.url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>
              {monitor.url}
            </a>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={handleManualCheck}
            title="Manual check"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <RefreshCw size={14} style={{ animation: checking ? 'spin-slow 0.8s linear infinite' : 'none' }} />
          </button>
          <button
            onClick={handleDelete}
            title={confirmDelete ? 'Click again to confirm' : 'Delete monitor'}
            className="btn-danger"
            style={{ padding: '4px 8px', fontSize: 12 }}>
            <Trash2 size={13} />
            {confirmDelete && <span style={{ marginLeft: 4 }}>Confirm?</span>}
          </button>
        </div>
      </div>

      {/* Status badge */}
      <div style={{ marginBottom: 20 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 100,
          background: `${statusColor}15`,
          border: `1px solid ${statusColor}40`,
          fontSize: 13, fontWeight: 700, color: statusColor,
        }}>
          {latestStatus || 'PENDING'}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div style={{ textAlign: 'center', padding: '10px 8px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            {avgResponseTime !== null && avgResponseTime !== undefined ? `${avgResponseTime}` : '—'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <Clock size={9} /> Avg ms
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '10px 8px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: uptimePct !== null && uptimePct !== undefined && uptimePct >= 99 ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>
            {uptimePct !== null && uptimePct !== undefined ? `${uptimePct}%` : '—'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <TrendingUp size={9} /> 24h Uptime
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '10px 8px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{monitor.interval}s</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Interval</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Added {formatDistanceToNow(new Date(monitor.created_at), { addSuffix: true })}
        </span>
        <span style={{ fontSize: 12, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
          View Details <ChevronRight size={12} />
        </span>
      </div>
    </div>
  )
}
