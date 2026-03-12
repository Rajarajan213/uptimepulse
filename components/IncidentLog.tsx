'use client'
import type { Incident } from '@/lib/supabase'
import { formatDistanceToNow, format } from 'date-fns'
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'

type Props = {
  incidents: Incident[]
}

export default function IncidentLog({ incidents }: Props) {
  if (!incidents.length) return (
    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: 14 }}>
      <CheckCircle size={32} color="var(--accent-green)" style={{ marginBottom: 12 }} />
      <div>No incidents recorded — great job! 🎉</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {incidents.map(incident => {
        const isOpen = !incident.resolved_at
        const duration = incident.resolved_at
          ? `Lasted ${formatDistanceToNow(new Date(incident.started_at), { addSuffix: false })}`
          : `Ongoing for ${formatDistanceToNow(new Date(incident.started_at), { addSuffix: false })}`

        return (
          <div key={incident.id} style={{
            background: 'var(--bg-secondary)',
            border: `1px solid ${isOpen ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.15)'}`,
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}>
            <div style={{ marginTop: 2 }}>
              {isOpen
                ? <AlertTriangle size={18} color="var(--accent-red)" />
                : <CheckCircle size={18} color="var(--accent-green)" />
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: isOpen ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                  {isOpen ? 'ONGOING OUTAGE' : 'RESOLVED'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={10} /> {duration}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Started: {format(new Date(incident.started_at), 'MMM d, yyyy HH:mm:ss')}
              </div>
              {incident.resolved_at && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Resolved: {format(new Date(incident.resolved_at), 'MMM d, yyyy HH:mm:ss')}
                </div>
              )}
              {incident.error && (
                <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 6, fontSize: 12, color: 'var(--accent-red)', fontFamily: 'monospace' }}>
                  {incident.error}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
