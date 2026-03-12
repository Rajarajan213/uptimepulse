'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, MapPin, Loader2, Globe2, AlertTriangle, RefreshCw,
  TrendingUp, Clock, Activity, ExternalLink, ChevronRight, Wifi, WifiOff
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false })

// ─── Types ───────────────────────────────────────────────────
type RecentBeat = { status: 'UP' | 'DOWN'; created_at: string; response_time: number | null }

type MonitorPoint = {
  id: string
  name: string
  url: string
  lat: number
  lng: number
  status: 'UP' | 'DOWN' | null
  city?: string
  country?: string
  region?: string
  flag?: string
  isp?: string
  ip?: string
  lastChecked?: string
}

type MonitorDetail = {
  uptimePct: number | null
  avgResponse: number | null
  totalChecks: number
  recentBeats: RecentBeat[]
  lastChecked: string | null
}

type UserLocation = {
  lat: number; lng: number
  city: string; region: string; country: string; flag: string
}

// ─── Geolocation helper ───────────────────────────────────────
async function geolocateUrl(url: string): Promise<{
  lat: number; lng: number; city: string; country: string
  region: string; flag: string; isp: string; ip: string
} | null> {
  try {
    const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
    const res = await fetch(`https://ipwho.is/${hostname}`)
    const data = await res.json()
    if (data.success && data.latitude && data.longitude) {
      return {
        lat: data.latitude, lng: data.longitude,
        city: data.city || 'Unknown',
        country: data.country || 'Unknown',
        region: data.region || '',
        flag: data.flag?.emoji || '🌐',
        isp: data.connection?.isp || data.org || '',
        ip: data.ip || '',
      }
    }
  } catch { /* ignore */ }
  return null
}

// ─── Colors ──────────────────────────────────────────────────
const sc = (status: 'UP' | 'DOWN' | null) =>
  status === 'UP' ? '#34d399' : status === 'DOWN' ? '#f43f5e' : '#94a3b8'

// ─── Sparkline bar (recent heartbeats) ───────────────────────
function Sparkline({ beats }: { beats: RecentBeat[] }) {
  if (!beats.length) return <div style={{ color: 'rgba(140,170,220,0.4)', fontSize: 12 }}>No data</div>
  const last = beats.slice(0, 30).reverse()
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28 }}>
      {last.map((b, i) => (
        <div key={i} title={`${b.status} · ${b.response_time ?? '—'}ms`} style={{
          flex: 1, minWidth: 4, maxWidth: 10,
          height: b.status === 'UP' ? `${Math.min(100, ((b.response_time ?? 200) / 800) * 100 + 30)}%` : '80%',
          borderRadius: 2,
          background: sc(b.status),
          opacity: 0.7 + i / last.length * 0.3,
        }} />
      ))}
    </div>
  )
}

// ─── Google-Maps-style Detail Panel ──────────────────────────
function DetailPanel({
  point, detail, loading, onClose, onZoom, onFlyTo,
}: {
  point: MonitorPoint
  detail: MonitorDetail | null
  loading: boolean
  onClose: () => void
  onZoom: () => void
  onFlyTo: () => void
}) {
  const color = sc(point.status)

  return (
    <div style={{
      position: 'fixed',
      right: 20, top: '50%', transform: 'translateY(-50%)',
      zIndex: 100,
      width: 360,
      animation: 'slideInRight 0.35s cubic-bezier(0.4,0,0.2,1)',
    }}>
      <div style={{
        background: 'rgba(4,10,36,0.96)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: `1px solid ${color}35`,
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 50px ${color}12`,
      }}>

        {/* ── Status banner ── */}
        <div style={{
          background: point.status === 'UP'
            ? 'linear-gradient(135deg, rgba(52,211,153,0.18), rgba(16,185,129,0.04))'
            : point.status === 'DOWN'
              ? 'linear-gradient(135deg, rgba(244,63,94,0.18), rgba(239,68,68,0.04))'
              : 'linear-gradient(135deg, rgba(148,163,184,0.12), transparent)',
          borderBottom: `1px solid ${color}20`,
          padding: '20px 22px 16px',
          position: 'relative',
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 14, right: 14,
            background: 'rgba(255,255,255,0.08)', border: 'none',
            color: 'rgba(180,210,255,0.8)', borderRadius: 10,
            width: 28, height: 28, cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>✕</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 14,
              background: `${color}20`, border: `2px solid ${color}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 20px ${color}30`,
            }}>
              {point.status === 'UP' ? <Wifi size={20} color={color} /> : point.status === 'DOWN' ? <WifiOff size={20} color={color} /> : <Activity size={20} color={color} />}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: 'white', letterSpacing: '-0.4px', lineHeight: 1.2 }}>
                {point.name}
              </div>
              <a href={point.url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ExternalLink size={10} /> {point.url.replace(/^https?:\/\//, '')}
              </a>
            </div>
          </div>

          {/* Big status badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: `${color}18`, border: `1px solid ${color}40`,
            borderRadius: 100, padding: '6px 16px',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: color,
              boxShadow: `0 0 8px ${color}`,
              animation: point.status === 'UP' ? 'glow-pulse 2s infinite' : undefined,
            }} />
            <span style={{ fontSize: 14, fontWeight: 800, color, letterSpacing: '0.02em' }}>
              {point.status === 'UP' ? 'OPERATIONAL' : point.status === 'DOWN' ? 'OUTAGE DETECTED' : 'CHECKING…'}
            </span>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: '18px 22px', maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>

          {/* Section 1: Quick stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
            {[
              {
                icon: <TrendingUp size={14} />,
                label: 'Uptime',
                value: loading ? '…' : detail?.uptimePct !== null && detail?.uptimePct !== undefined
                  ? `${detail.uptimePct}%` : '—',
                color: detail?.uptimePct && detail.uptimePct >= 99 ? '#34d399' : '#fbbf24',
              },
              {
                icon: <Clock size={14} />,
                label: 'Avg Response',
                value: loading ? '…' : detail?.avgResponse ? `${detail.avgResponse}ms` : '—',
                color: detail?.avgResponse && detail.avgResponse < 200 ? '#34d399' : detail?.avgResponse && detail.avgResponse < 600 ? '#fbbf24' : '#f43f5e',
              },
              {
                icon: <Activity size={14} />,
                label: 'Checks',
                value: loading ? '…' : `${detail?.totalChecks ?? 0}`,
                color: '#a78bfa',
              },
            ].map(s => (
              <div key={s.label} style={{
                textAlign: 'center', padding: '12px 8px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(120,160,255,0.08)',
                borderRadius: 14,
              }}>
                <div style={{ color: 'rgba(160,190,240,0.5)', marginBottom: 6, display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
                <div style={{ fontSize: 9, color: 'rgba(140,170,220,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Section 2: Location */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(160,190,240,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              📍 Server Location
            </div>
            <div style={{
              background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)',
              borderRadius: 14, padding: '14px 16px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'City', value: point.city || '—' },
                  { label: 'Region', value: point.region || '—' },
                  { label: 'Country', value: `${point.flag} ${point.country}` || '—' },
                  { label: 'ISP', value: point.isp || '—' },
                ].map(r => (
                  <div key={r.label}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(140,170,220,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{r.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(200,225,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.value}</div>
                  </div>
                ))}
              </div>
              {point.ip && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(56,189,248,0.12)', fontSize: 11, color: 'rgba(140,170,220,0.5)', fontFamily: 'monospace' }}>
                  IP: {point.ip}
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(140,170,220,0.4)', fontFamily: 'monospace' }}>
                {point.lat.toFixed(4)}° N, {point.lng.toFixed(4)}° E
              </div>
            </div>
          </div>

          {/* Section 3: Time */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(160,190,240,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              🕐 Time Info
            </div>
            <div style={{
              background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)',
              borderRadius: 14, padding: '14px 16px',
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
            }}>
              {[
                {
                  label: 'Last Checked',
                  value: detail?.lastChecked
                    ? formatDistanceToNow(new Date(detail.lastChecked), { addSuffix: true })
                    : '—',
                },
                {
                  label: 'Exact Time',
                  value: detail?.lastChecked
                    ? format(new Date(detail.lastChecked), 'HH:mm:ss')
                    : '—',
                },
                {
                  label: 'Date',
                  value: detail?.lastChecked
                    ? format(new Date(detail.lastChecked), 'MMM dd, yyyy')
                    : '—',
                },
                {
                  label: 'Check Freq',
                  value: 'Every 60s',
                },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(140,170,220,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(200,225,255,0.9)' }}>{r.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Recent heartbeats sparkline */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(160,190,240,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                📊 Recent Checks (last 30)
              </div>
              <div style={{ fontSize: 10, color: 'rgba(140,170,220,0.4)' }}>
                {detail?.recentBeats.filter(b => b.status === 'UP').length ?? 0} UP / {detail?.recentBeats.filter(b => b.status === 'DOWN').length ?? 0} DOWN
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(120,160,255,0.1)',
              borderRadius: 14, padding: '12px 14px',
            }}>
              {loading
                ? <div className="skeleton" style={{ height: 28, borderRadius: 6 }} />
                : <Sparkline beats={detail?.recentBeats ?? []} />
              }
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 10, color: 'rgba(140,170,220,0.4)' }}>Oldest</span>
                <span style={{ fontSize: 10, color: 'rgba(140,170,220,0.4)' }}>Latest</span>
              </div>
            </div>
          </div>

          {/* Section 5: Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link href={`/dashboard/monitor/${point.id}`} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              textDecoration: 'none', padding: '13px', borderRadius: 14, fontSize: 14, fontWeight: 700,
              background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
              color: 'white', boxShadow: '0 6px 20px rgba(56,189,248,0.3)',
            }}>
              View Full Monitor Details <ChevronRight size={16} />
            </Link>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onFlyTo} style={{
                flex: 1, padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', color: 'rgba(180,210,255,0.8)', fontSize: 12, fontWeight: 600
              }}>🔍 Fly To</button>
              <button onClick={onZoom} style={{
                flex: 1, padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', color: 'rgba(180,210,255,0.8)', fontSize: 12, fontWeight: 600
              }}>🔎 Zoom In</button>
              <a href={point.url} target="_blank" rel="noopener noreferrer" style={{
                flex: 1, padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', color: 'rgba(180,210,255,0.8)', fontSize: 12, fontWeight: 600,
                textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
              }}>
                <ExternalLink size={12} /> Open
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function GlobeMapPage() {
  const router = useRouter()
  const globeRef = useRef<any>(null)

  const [loading, setLoading] = useState(true)
  const [geoLoading, setGeoLoading] = useState(false)
  const [locationDenied, setLocationDenied] = useState(false)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [monitorPoints, setMonitorPoints] = useState<MonitorPoint[]>([])
  const [selectedPoint, setSelectedPoint] = useState<MonitorPoint | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<MonitorDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 })

  useEffect(() => {
    const upd = () => setDimensions({ w: window.innerWidth, h: window.innerHeight })
    upd()
    window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [])

  // Fetch monitors + geolocate
  const fetchMonitors = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: monitors } = await supabase
      .from('monitors').select('id,name,url').eq('user_id', user.id)
    if (!monitors) { setLoading(false); return }

    const points: MonitorPoint[] = []
    await Promise.all(monitors.map(async (m) => {
      const [geo, beatRes] = await Promise.all([
        geolocateUrl(m.url),
        supabase.from('heartbeats').select('status,created_at')
          .eq('monitor_id', m.id).order('created_at', { ascending: false }).limit(1).single(),
      ])
      if (geo) {
        points.push({
          id: m.id, name: m.name, url: m.url,
          lat: geo.lat + (Math.random() - 0.5) * 0.4,
          lng: geo.lng + (Math.random() - 0.5) * 0.4,
          status: (beatRes.data?.status as 'UP' | 'DOWN') || null,
          city: geo.city, country: geo.country, region: geo.region,
          flag: geo.flag, isp: geo.isp, ip: geo.ip,
          lastChecked: beatRes.data?.created_at,
        })
      }
    }))

    setMonitorPoints(points)
    setLoading(false)
  }, [router])

  useEffect(() => { fetchMonitors() }, [fetchMonitors])

  // Fetch detailed stats for a monitor when clicked
  const fetchDetail = useCallback(async (monitorId: string) => {
    setDetailLoading(true)
    setSelectedDetail(null)

    const { data: beats } = await supabase
      .from('heartbeats')
      .select('status,response_time,created_at')
      .eq('monitor_id', monitorId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (!beats || beats.length === 0) {
      setSelectedDetail({ uptimePct: null, avgResponse: null, totalChecks: 0, recentBeats: [], lastChecked: null })
      setDetailLoading(false)
      return
    }

    const upCount = beats.filter(b => b.status === 'UP').length
    const uptimePct = Math.round((upCount / beats.length) * 1000) / 10
    const responseTimes = beats.filter(b => b.response_time !== null).map(b => b.response_time as number)
    const avgResponse = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : null
    const recentBeats = beats.slice(0, 30).map(b => ({
      status: b.status as 'UP' | 'DOWN',
      created_at: b.created_at,
      response_time: b.response_time,
    }))

    setSelectedDetail({
      uptimePct,
      avgResponse,
      totalChecks: beats.length,
      recentBeats,
      lastChecked: beats[0]?.created_at ?? null,
    })
    setDetailLoading(false)
  }, [])

  // Handle pin click
  const handlePointClick = useCallback((point: MonitorPoint) => {
    setSelectedPoint(point)
    fetchDetail(point.id)
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: point.lat, lng: point.lng, altitude: 1.0 }, 1800)
    }
  }, [fetchDetail])

  // Request user geolocation
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationDenied(true); return }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        try {
          const res = await fetch('https://ipwho.is/')
          const d = await res.json()
          setUserLocation({ lat, lng, city: d.city || 'You', region: d.region || '', country: d.country || '', flag: d.flag?.emoji || '📍' })
        } catch {
          setUserLocation({ lat, lng, city: 'Your Location', region: '', country: '', flag: '📍' })
        }
        setGeoLoading(false)
        globeRef.current?.pointOfView({ lat, lng, altitude: 1.5 }, 2500)
      },
      () => { setLocationDenied(true); setGeoLoading(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  const flyTo = useCallback((lat: number, lng: number, alt = 1.2) => {
    globeRef.current?.pointOfView({ lat, lng, altitude: alt }, 2000)
  }, [])

  useEffect(() => {
    if (!loading) setTimeout(() => requestLocation(), 600)
  }, [loading, requestLocation])

  // Globe data
  const allPoints = [
    ...monitorPoints.map(p => ({
      lat: p.lat, lng: p.lng, size: 0.65, color: sc(p.status),
      label: `<div style="background:rgba(4,8,28,0.93);border:1px solid ${sc(p.status)}50;border-radius:12px;padding:8px 12px;color:white;font-family:sans-serif;font-size:12px;font-weight:700;backdrop-filter:blur(12px)">${p.name}<br/><span style="color:${sc(p.status)};font-size:11px">${p.status ?? '?'}</span></div>`,
      isUser: false, data: p,
    })),
    ...(userLocation ? [{
      lat: userLocation.lat, lng: userLocation.lng, size: 0.9, color: '#f97316',
      label: `<div style="background:rgba(4,8,28,0.93);border:1px solid #f9731650;border-radius:12px;padding:8px 12px;color:white;font-family:sans-serif;font-size:12px;font-weight:700">📍 You — ${userLocation.city}</div>`,
      isUser: true, data: null,
    }] : []),
  ]

  const arcs = userLocation
    ? monitorPoints.map(p => ({
        startLat: userLocation.lat, startLng: userLocation.lng,
        endLat: p.lat, endLng: p.lng,
        color: ['rgba(56,189,248,0.5)', sc(p.status) + '99'],
        stroke: p.status === 'DOWN' ? 1.6 : 0.8,
      }))
    : []

  return (
    <div style={{ minHeight: '100vh', background: '#050d1f', position: 'relative', overflow: 'hidden' }}>

      {/* Stars */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse at center, #0f1f3d 0%, #050d1f 70%)' }}>
        {Array.from({ length: 100 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute', borderRadius: '50%', background: 'rgba(255,255,255,0.75)',
            width: i % 7 === 0 ? 3 : 1.5, height: i % 7 === 0 ? 3 : 1.5,
            top: `${(i * 37 + i * i * 0.3) % 100}%`,
            left: `${(i * 53 + i * 11) % 100}%`,
            animation: `glow-pulse ${2 + (i % 5)}s ease-in-out infinite`,
            animationDelay: `${(i % 7) * 0.35}s`,
          }} />
        ))}
      </div>

      {/* ── Header ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(4,8,28,0.88)', backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(120,160,255,0.14)', padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(160,190,240,0.75)', textDecoration: 'none', fontSize: 13 }}>
              <ArrowLeft size={15} /> Dashboard
            </Link>
            <div style={{ width: 1, height: 18, background: 'rgba(120,160,255,0.2)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg, #38bdf8, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(56,189,248,0.4)' }}>
                <Globe2 size={18} color="white" />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'white' }}>🌍 Live Location Map</div>
                <div style={{ fontSize: 10, color: 'rgba(160,190,240,0.5)' }}>3D globe · click any site to see full details</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!userLocation && !locationDenied && (
              <button onClick={requestLocation} disabled={geoLoading} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 16px', borderRadius: 100, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #f97316, #a855f7)', color: 'white', fontSize: 12, fontWeight: 700,
                boxShadow: '0 4px 18px rgba(249,115,22,0.4)', opacity: geoLoading ? 0.7 : 1,
              }}>
                {geoLoading ? <Loader2 size={13} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <MapPin size={13} />}
                {geoLoading ? 'Locating...' : 'Allow Location'}
              </button>
            )}
            {userLocation && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 100, background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', fontSize: 12, color: '#f97316', fontWeight: 600 }}>
                <MapPin size={12} /> {userLocation.flag} {userLocation.city}, {userLocation.country}
              </div>
            )}
            {locationDenied && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#f43f5e', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 100, padding: '7px 12px' }}>
                <AlertTriangle size={12} /> Location denied
              </div>
            )}
            <button onClick={fetchMonitors} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(120,160,255,0.25)', color: 'white', borderRadius: 11, padding: '9px', cursor: 'pointer' }}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin-slow 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Globe ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loading ? (
          <div style={{ textAlign: 'center' }}>
            <Loader2 size={44} color="#38bdf8" style={{ animation: 'spin-slow 1s linear infinite', marginBottom: 14 }} />
            <div style={{ color: 'rgba(180,210,255,0.7)', fontSize: 15 }}>Geolocating your monitors…</div>
          </div>
        ) : (
          <Globe
            ref={globeRef}
            width={dimensions.w}
            height={dimensions.h}
            onGlobeReady={() => {
              globeRef.current?.pointOfView({ lat: 20, lng: 78, altitude: 2.4 }, 0)
              setTimeout(() => globeRef.current?.pointOfView({ lat: 20, lng: 78, altitude: 1.8 }, 2200), 400)
            }}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
            showAtmosphere={true}
            atmosphereColor="rgba(56,189,248,0.22)"
            atmosphereAltitude={0.15}
            pointsData={allPoints}
            pointLat={(d: any) => d.lat}
            pointLng={(d: any) => d.lng}
            pointColor={(d: any) => d.color}
            pointRadius={(d: any) => d.size}
            pointAltitude={0.01}
            pointLabel={(d: any) => d.label}
            onPointClick={(point: any) => {
              if (point.data) handlePointClick(point.data)
              else flyTo(point.lat, point.lng, 0.5)
            }}
            arcsData={arcs}
            arcStartLat={(d: any) => d.startLat}
            arcStartLng={(d: any) => d.startLng}
            arcEndLat={(d: any) => d.endLat}
            arcEndLng={(d: any) => d.endLng}
            arcColor={(d: any) => d.color}
            arcAltitudeAutoScale={0.32}
            arcStroke={(d: any) => d.stroke}
            arcDashLength={0.45}
            arcDashGap={0.12}
            arcDashAnimateTime={2200}
            ringsData={userLocation ? [{ lat: userLocation.lat, lng: userLocation.lng }] : []}
            ringLat={(d: any) => d.lat}
            ringLng={(d: any) => d.lng}
            ringColor={() => '#f97316'}
            ringMaxRadius={3}
            ringPropagationSpeed={2}
            ringRepeatPeriod={1100}
            labelsData={monitorPoints}
            labelLat={(d: any) => d.lat}
            labelLng={(d: any) => d.lng}
            labelAltitude={0.018}
            labelText={(d: any) => d.name}
            labelSize={0.38}
            labelColor={(d: any) => sc(d.status)}
            labelResolution={3}
            labelDotRadius={0.22}
            enablePointerInteraction={true}
          />
        )}
      </div>

      {/* ── Rich Detail Panel ── */}
      {selectedPoint && (
        <DetailPanel
          point={selectedPoint}
          detail={selectedDetail}
          loading={detailLoading}
          onClose={() => { setSelectedPoint(null); setSelectedDetail(null) }}
          onZoom={() => flyTo(selectedPoint.lat, selectedPoint.lng, 0.4)}
          onFlyTo={() => flyTo(selectedPoint.lat, selectedPoint.lng, 1.0)}
        />
      )}

      {/* ── Left sidebar ── */}
      <div style={{
        position: 'fixed', top: 80, left: 16, zIndex: 10,
        background: 'rgba(4,10,35,0.88)', backdropFilter: 'blur(18px)',
        border: '1px solid rgba(120,160,255,0.14)', borderRadius: 18, padding: '14px',
        maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', minWidth: 210,
        display: selectedPoint ? 'none' : undefined,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(160,190,240,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
          Monitors ({monitorPoints.length})
        </div>
        {loading ? (
          [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 12, marginBottom: 6 }} />)
        ) : (
          monitorPoints.map(p => (
            <div key={p.id} onClick={() => handlePointClick(p)} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '9px 11px', marginBottom: 5, borderRadius: 12, cursor: 'pointer',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(120,160,255,0.08)',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = `${sc(p.status)}12` }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)' }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc(p.status), flexShrink: 0, boxShadow: `0 0 6px ${sc(p.status)}` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(140,170,220,0.5)', marginTop: 1 }}>{p.flag} {p.city}, {p.country}</div>
              </div>
              <ChevronRight size={12} color="rgba(140,170,220,0.35)" />
            </div>
          ))
        )}
        {userLocation && (
          <div onClick={() => flyTo(userLocation.lat, userLocation.lng, 0.7)} style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', marginTop: 6, borderRadius: 12, cursor: 'pointer',
            background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.22)',
          }}>
            <span style={{ fontSize: 14 }}>📍</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#f97316' }}>Your Location</div>
              <div style={{ fontSize: 9, color: 'rgba(140,170,220,0.5)', marginTop: 1 }}>{userLocation.city}, {userLocation.country}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Legend (hidden when panel open) ── */}
      {!selectedPoint && (
        <div style={{
          position: 'fixed', bottom: 24, right: 16, zIndex: 10,
          background: 'rgba(4,10,35,0.88)', backdropFilter: 'blur(18px)',
          border: '1px solid rgba(120,160,255,0.14)', borderRadius: 16, padding: '14px 16px',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(160,190,240,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Legend</div>
          {[
            { color: '#34d399', label: 'Monitor — UP' },
            { color: '#f43f5e', label: 'Monitor — DOWN' },
            { color: '#94a3b8', label: 'Unknown status' },
            { color: '#f97316', label: '📍 Your Location' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: l.color, boxShadow: `0 0 5px ${l.color}` }} />
              <span style={{ fontSize: 11, color: 'rgba(180,210,255,0.75)', fontWeight: 500 }}>{l.label}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(120,160,255,0.1)', marginTop: 8, paddingTop: 8, fontSize: 10, color: 'rgba(140,170,220,0.4)' }}>
            Click a pin to inspect
          </div>
        </div>
      )}
    </div>
  )
}
