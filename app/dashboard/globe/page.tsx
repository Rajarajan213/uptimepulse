'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, MapPin, Loader2, Globe2, Wifi, AlertTriangle, RefreshCw } from 'lucide-react'

// Dynamic import — react-globe.gl requires browser APIs (WebGL)
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false })

// ─── Types ───────────────────────────────────────────────────
type MonitorPoint = {
  id: string
  name: string
  url: string
  lat: number
  lng: number
  status: 'UP' | 'DOWN' | null
  city?: string
  country?: string
  flag?: string
}

type UserLocation = {
  lat: number
  lng: number
  city: string
  region: string
  country: string
  flag: string
}

// ─── Geolocation helpers ─────────────────────────────────────
async function geolocateUrl(url: string): Promise<{ lat: number; lng: number; city: string; country: string; flag: string } | null> {
  try {
    const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
    const res = await fetch(`https://ipwho.is/${hostname}`)
    const data = await res.json()
    if (data.success && data.latitude && data.longitude) {
      return {
        lat: data.latitude,
        lng: data.longitude,
        city: data.city || 'Unknown',
        country: data.country || 'Unknown',
        flag: data.flag?.emoji || '🌐',
      }
    }
  } catch { /* ignore */ }
  return null
}

// ─── Status dot colors ─────────────────────────────────────
function statusColor(status: 'UP' | 'DOWN' | null) {
  if (status === 'UP')   return '#34d399'
  if (status === 'DOWN') return '#f43f5e'
  return '#94a3b8'
}

// ─── Main Component ──────────────────────────────────────────
export default function GlobeMapPage() {
  const router = useRouter()
  const globeRef = useRef<any>(null)

  const [loading, setLoading] = useState(true)
  const [geoLoading, setGeoLoading] = useState(false)
  const [locationDenied, setLocationDenied] = useState(false)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [monitorPoints, setMonitorPoints] = useState<MonitorPoint[]>([])
  const [selectedPoint, setSelectedPoint] = useState<MonitorPoint | null>(null)
  const [globeReady, setGlobeReady] = useState(false)
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 })

  // Responsive sizing
  useEffect(() => {
    const update = () => setDimensions({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // ── Fetch monitors ─────────────────────────────────────────
  const fetchMonitors = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: monitors } = await supabase
      .from('monitors').select('id,name,url').eq('user_id', user.id)
    if (!monitors) { setLoading(false); return }

    // Geolocate + get latest status in parallel
    const points: MonitorPoint[] = []
    await Promise.all(monitors.map(async (m) => {
      const [geo, beatRes] = await Promise.all([
        geolocateUrl(m.url),
        supabase.from('heartbeats').select('status')
          .eq('monitor_id', m.id).order('created_at', { ascending: false }).limit(1).single(),
      ])
      if (geo) {
        points.push({
          id: m.id,
          name: m.name,
          url: m.url,
          lat: geo.lat + (Math.random() - 0.5) * 0.5, // slight jitter to avoid overlap
          lng: geo.lng + (Math.random() - 0.5) * 0.5,
          status: (beatRes.data?.status as 'UP' | 'DOWN') || null,
          city: geo.city,
          country: geo.country,
          flag: geo.flag,
        })
      }
    }))

    setMonitorPoints(points)
    setLoading(false)
  }, [router])

  useEffect(() => { fetchMonitors() }, [fetchMonitors])

  // ── Request geolocation ─────────────────────────────────────
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationDenied(true); return }
    setGeoLoading(true)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        // Reverse geocode
        try {
          const res = await fetch(`https://ipwho.is/`)
          const data = await res.json()
          setUserLocation({
            lat, lng,
            city: data.city || 'Your Location',
            region: data.region || '',
            country: data.country || '',
            flag: data.flag?.emoji || '📍',
          })
        } catch {
          setUserLocation({ lat, lng, city: 'Your Location', region: '', country: '', flag: '📍' })
        }
        setGeoLoading(false)

        // Fly to user location
        if (globeRef.current) {
          globeRef.current.pointOfView({ lat, lng, altitude: 1.5 }, 2500)
        }
      },
      () => {
        setLocationDenied(true)
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // ── Fly to a point ─────────────────────────────────────────
  const flyTo = useCallback((lat: number, lng: number, alt = 1.2) => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat, lng, altitude: alt }, 2000)
    }
  }, [])

  // Auto-request location on mount
  useEffect(() => {
    if (!loading) {
      setTimeout(() => requestLocation(), 800)
    }
  }, [loading, requestLocation])

  // After globe mounts, do initial fly-in
  const handleGlobeReady = useCallback(() => {
    setGlobeReady(true)
    if (globeRef.current) {
      // Start with overview  
      globeRef.current.pointOfView({ lat: 20, lng: 78, altitude: 2.5 }, 0)
      // Slowly zoom in
      setTimeout(() => {
        globeRef.current?.pointOfView({ lat: 20, lng: 78, altitude: 1.8 }, 2000)
      }, 500)
    }
  }, [])

  // ── All pins (user + monitors) ────────────────────────────
  const allPoints = [
    ...monitorPoints.map(p => ({
      lat: p.lat,
      lng: p.lng,
      size: 0.6,
      color: statusColor(p.status),
      label: `${p.name} (${p.status || '?'})`,
      isUser: false,
      data: p,
    })),
    ...(userLocation ? [{
      lat: userLocation.lat,
      lng: userLocation.lng,
      size: 0.9,
      color: '#f97316',
      label: `${userLocation.flag} You — ${userLocation.city}`,
      isUser: true,
      data: null,
    }] : []),
  ]

  // Arc connections from user to each monitor
  const arcs = userLocation
    ? monitorPoints.map(p => ({
        startLat: userLocation.lat,
        startLng: userLocation.lng,
        endLat: p.lat,
        endLng: p.lng,
        color: ['rgba(56,189,248,0.6)', statusColor(p.status) + 'aa'],
        stroke: p.status === 'DOWN' ? 1.5 : 0.8,
      }))
    : []

  return (
    <div style={{ minHeight: '100vh', background: '#060d1f', position: 'relative', overflow: 'hidden' }}>

      {/* Deep space background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse at center, #0f1f3d 0%, #060d1f 70%)',
      }}>
        {/* Stars */}
        {Array.from({ length: 120 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: i % 5 === 0 ? 3 : 1.5,
            height: i % 5 === 0 ? 3 : 1.5,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.8)',
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animation: `glow-pulse ${2 + (i % 4)}s ease-in-out infinite`,
            animationDelay: `${(i % 7) * 0.4}s`,
          }} />
        ))}
      </div>

      {/* ── Header ─────────────────────────────────────────── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(4,8,28,0.85)', backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(120,160,255,0.14)',
        padding: '0 28px',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(160,190,240,0.8)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
              <ArrowLeft size={16} /> Dashboard
            </Link>
            <div style={{ width: 1, height: 20, background: 'rgba(120,160,255,0.2)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(56,189,248,0.4)'
              }}>
                <Globe2 size={20} color="white" />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 900, color: 'white', letterSpacing: '-0.4px' }}>🌍 Live Location Map</div>
                <div style={{ fontSize: 11, color: 'rgba(160,190,240,0.5)' }}>3D globe · real-time monitor locations</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {!userLocation && !locationDenied && (
              <button onClick={requestLocation} disabled={geoLoading} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 100, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #f97316, #a855f7)',
                color: 'white', fontSize: 13, fontWeight: 700,
                boxShadow: '0 4px 20px rgba(249,115,22,0.4)',
                opacity: geoLoading ? 0.7 : 1,
              }}>
                {geoLoading ? <Loader2 size={14} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <MapPin size={14} />}
                {geoLoading ? 'Locating...' : 'Allow Location'}
              </button>
            )}
            {userLocation && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 100,
                background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)',
                fontSize: 13, color: '#f97316', fontWeight: 600
              }}>
                <MapPin size={13} /> {userLocation.flag} {userLocation.city}, {userLocation.country}
              </div>
            )}
            {locationDenied && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 13, color: '#f43f5e', fontWeight: 500,
                background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)',
                borderRadius: 100, padding: '8px 14px'
              }}>
                <AlertTriangle size={13} /> Location denied
              </div>
            )}
            <button onClick={fetchMonitors} style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(120,160,255,0.25)',
              color: 'white', borderRadius: 12, padding: '10px', cursor: 'pointer'
            }}>
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ── 3D Globe ────────────────────────────────────────── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loading ? (
          <div style={{ textAlign: 'center' }}>
            <Loader2 size={48} color="#38bdf8" style={{ animation: 'spin-slow 1s linear infinite', marginBottom: 16 }} />
            <div style={{ color: 'rgba(180,210,255,0.7)', fontSize: 16 }}>Locating your monitors...</div>
          </div>
        ) : (
          <Globe
            ref={globeRef}
            width={dimensions.w}
            height={dimensions.h}
            onGlobeReady={handleGlobeReady}
            // Globe appearance
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
            // Atmosphere
            showAtmosphere={true}
            atmosphereColor="rgba(56,189,248,0.25)"
            atmosphereAltitude={0.15}
            // Points (monitors + user)
            pointsData={allPoints}
            pointLat={(d: any) => d.lat}
            pointLng={(d: any) => d.lng}
            pointColor={(d: any) => d.color}
            pointRadius={(d: any) => d.size}
            pointAltitude={0.01}
            pointLabel={(d: any) => `<div style="background:rgba(4,8,28,0.92);border:1px solid rgba(120,160,255,0.3);border-radius:12px;padding:10px 14px;color:white;font-family:Outfit,sans-serif;font-size:13px;font-weight:600;backdrop-filter:blur(12px);max-width:200px">${d.label}</div>`}
            onPointClick={(point: any) => {
              if (point.data) {
                setSelectedPoint(point.data)
                flyTo(point.lat, point.lng, 0.8)
              } else {
                // User location clicked — zoom in
                flyTo(point.lat, point.lng, 0.5)
              }
            }}
            // Arcs (user → monitors)
            arcsData={arcs}
            arcStartLat={(d: any) => d.startLat}
            arcStartLng={(d: any) => d.startLng}
            arcEndLat={(d: any) => d.endLat}
            arcEndLng={(d: any) => d.endLng}
            arcColor={(d: any) => d.color}
            arcAltitudeAutoScale={0.3}
            arcStroke={(d: any) => d.stroke}
            arcDashLength={0.4}
            arcDashGap={0.15}
            arcDashAnimateTime={2500}
            // Rings on user location
            ringsData={userLocation ? [{ lat: userLocation.lat, lng: userLocation.lng }] : []}
            ringLat={(d: any) => d.lat}
            ringLng={(d: any) => d.lng}
            ringColor={() => '#f97316'}
            ringMaxRadius={3}
            ringPropagationSpeed={2}
            ringRepeatPeriod={1200}
            // Labels on monitor points
            labelsData={monitorPoints}
            labelLat={(d: any) => d.lat}
            labelLng={(d: any) => d.lng}
            labelAltitude={0.015}
            labelText={(d: any) => d.name}
            labelSize={0.4}
            labelColor={(d: any) => statusColor(d.status)}
            labelResolution={3}
            labelDotRadius={0.25}
            // Globe controls
            enablePointerInteraction={true}
          />
        )}
      </div>

      {/* ── Selected Monitor Popup ──────────────────────────── */}
      {selectedPoint && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, animation: 'fadeInUp 0.4s ease',
          width: '90%', maxWidth: 480,
        }}>
          <div style={{
            background: 'rgba(4,12,40,0.92)', backdropFilter: 'blur(24px)',
            border: `1px solid ${statusColor(selectedPoint.status)}40`,
            borderRadius: 24, padding: '24px 28px',
            boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 40px ${statusColor(selectedPoint.status)}20`,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor(selectedPoint.status), boxShadow: `0 0 10px ${statusColor(selectedPoint.status)}` }} />
                  <span style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>{selectedPoint.name}</span>
                </div>
                <a href={selectedPoint.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#38bdf8', textDecoration: 'none' }}>
                  {selectedPoint.url}
                </a>
              </div>
              <button onClick={() => setSelectedPoint(null)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Status', value: selectedPoint.status || '?', color: statusColor(selectedPoint.status) },
                { label: 'City', value: selectedPoint.city || '—', color: '#38bdf8' },
                { label: 'Country', value: `${selectedPoint.flag} ${selectedPoint.country}`, color: '#a78bfa' },
              ].map(s => (
                <div key={s.label} style={{
                  textAlign: 'center', padding: '10px',
                  background: 'rgba(255,255,255,0.04)', borderRadius: 12,
                  border: '1px solid rgba(120,160,255,0.1)'
                }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'rgba(140,170,220,0.5)', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Link href={`/dashboard/monitor/${selectedPoint.id}`} style={{
                flex: 1, textAlign: 'center', textDecoration: 'none',
                padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
                color: 'white', boxShadow: '0 4px 16px rgba(56,189,248,0.3)',
              }}>
                View Monitor Details →
              </Link>
              <button onClick={() => flyTo(selectedPoint.lat, selectedPoint.lng, 0.5)} style={{
                padding: '11px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.07)', color: 'white', fontSize: 13, fontWeight: 600
              }}>
                🔍 Zoom In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Legend ──────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', top: 90, right: 20, zIndex: 10,
        background: 'rgba(4,10,35,0.85)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(120,160,255,0.15)',
        borderRadius: 16, padding: '16px 18px',
        minWidth: 170,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(160,190,240,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Legend</div>
        {[
          { color: '#34d399', label: 'Monitor — UP' },
          { color: '#f43f5e', label: 'Monitor — DOWN' },
          { color: '#94a3b8', label: 'Monitor — Unknown' },
          { color: '#f97316', label: '📍 Your Location' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
            <span style={{ fontSize: 12, color: 'rgba(180,210,255,0.8)', fontWeight: 500 }}>{l.label}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid rgba(120,160,255,0.1)', marginTop: 10, paddingTop: 10, fontSize: 11, color: 'rgba(140,170,220,0.5)' }}>
          Click a dot to inspect
        </div>
      </div>

      {/* ── Monitor List sidebar ─────────────────────────────── */}
      <div style={{
        position: 'fixed', top: 90, left: 20, zIndex: 10,
        background: 'rgba(4,10,35,0.85)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(120,160,255,0.15)',
        borderRadius: 16, padding: '16px',
        maxHeight: 'calc(100vh - 160px)',
        overflowY: 'auto', minWidth: 220,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(160,190,240,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Monitors ({monitorPoints.length})
        </div>
        {loading ? (
          <div style={{ color: 'rgba(160,190,240,0.5)', fontSize: 12 }}>Loading...</div>
        ) : monitorPoints.length === 0 ? (
          <div style={{ color: 'rgba(160,190,240,0.4)', fontSize: 12 }}>
            No geolocatable monitors found.<br />
            <Link href="/dashboard" style={{ color: '#38bdf8', fontSize: 12 }}>Add monitors →</Link>
          </div>
        ) : (
          monitorPoints.map(p => (
            <div
              key={p.id}
              onClick={() => {
                setSelectedPoint(p)
                flyTo(p.lat, p.lng, 0.8)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', marginBottom: 6, borderRadius: 12,
                cursor: 'pointer',
                background: selectedPoint?.id === p.id ? `${statusColor(p.status)}15` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selectedPoint?.id === p.id ? statusColor(p.status) + '40' : 'rgba(120,160,255,0.08)'}`,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(p.status), flexShrink: 0, boxShadow: `0 0 6px ${statusColor(p.status)}` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(140,170,220,0.5)', marginTop: 1 }}>{p.flag} {p.city}, {p.country}</div>
              </div>
            </div>
          ))
        )}

        {userLocation && (
          <div
            onClick={() => flyTo(userLocation.lat, userLocation.lng, 0.6)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', marginTop: 8, borderRadius: 12,
              cursor: 'pointer',
              background: 'rgba(249,115,22,0.08)',
              border: '1px solid rgba(249,115,22,0.25)',
            }}
          >
            <span style={{ fontSize: 16 }}>📍</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f97316' }}>Your Location</div>
              <div style={{ fontSize: 10, color: 'rgba(140,170,220,0.5)', marginTop: 1 }}>{userLocation.city}, {userLocation.country}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
