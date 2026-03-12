'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts'
import type { Heartbeat } from '@/lib/supabase'
import { format } from 'date-fns'

type Props = {
  heartbeats: Heartbeat[]
}

type CustomTooltipProps = {
  active?: boolean
  payload?: Array<{ value: number; payload: { status: string } }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  const status = payload[0].payload.status
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color: val > 500 ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>{val}ms</div>
      <div style={{ color: status === 'UP' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>{status}</div>
    </div>
  )
}

export default function ResponseTimeChart({ heartbeats }: Props) {
  if (!heartbeats.length) return (
    <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
      No data yet — check back after the first ping
    </div>
  )

  const data = [...heartbeats].reverse().slice(-50).map(h => ({
    time: format(new Date(h.created_at), 'HH:mm'),
    response_time: h.response_time ?? 0,
    status: h.status,
  }))

  const avgTime = Math.round(data.reduce((a, d) => a + d.response_time, 0) / data.length)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Avg: <strong style={{ color: 'var(--text-primary)' }}>{avgTime}ms</strong></span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Showing last {data.length} pings</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="respGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={avgTime} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} />
          <Area
            type="monotone"
            dataKey="response_time"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#respGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
