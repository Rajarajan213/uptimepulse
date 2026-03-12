'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Activity, Zap, Shield, Globe, ChevronRight, CheckCircle, ArrowRight, TrendingUp, Wifi } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    try {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) router.push('/dashboard')
        else setChecking(false)
      }).catch(() => setChecking(false))
    } catch {
      setChecking(false)
    }
  }, [router])

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div style={{ width: 44, height: 44, border: '3px solid rgba(56,189,248,0.3)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      
      {/* ── Lively Scene Background ── */}
      <div className="scene-bg">
        {/* Cloud layers */}
        <div className="cloud cloud-1" />
        <div className="cloud cloud-2" />
        <div className="cloud cloud-3" />
        <div className="cloud cloud-4" />
        {/* Glowing orbs */}
        <div className="orb orb-blue" />
        <div className="orb orb-purple" />
        <div className="orb orb-cyan" />
        <div className="orb orb-green" />
        {/* Data streams */}
        <div className="data-stream-layer">
          {[15, 35, 55, 72, 88].map((top, i) => (
            <div key={i} className="data-stream" style={{
              top: `${top}%`, width: `${180 + i * 40}px`,
              animationDelay: `${i * 1.8}s`,
              animationDuration: `${7 + i}s`
            }} />
          ))}
        </div>
        {/* Star field */}
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: Math.random() > 0.7 ? 3 : 2,
            height: Math.random() > 0.7 ? 3 : 2,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.7)',
            top: `${Math.random() * 60}%`,
            left: `${Math.random() * 100}%`,
            animation: `glow-pulse ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }} />
        ))}
      </div>

      {/* Content layer */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Navbar ── */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          borderBottom: '1px solid rgba(120,160,255,0.12)',
          padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(5, 10, 30, 0.70)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(56,189,248,0.4)'
            }}>
              <Activity size={20} color="white" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
              Uptime<span className="gradient-text">Pulse</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/login" className="btn-secondary" style={{ textDecoration: 'none', borderRadius: 100, padding: '10px 22px' }}>Sign In</Link>
            <Link href="/register" className="btn-primary" style={{ textDecoration: 'none', borderRadius: 100, padding: '10px 22px' }}>Get Started Free</Link>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section style={{ paddingTop: 160, paddingBottom: 100, textAlign: 'center', maxWidth: 900, margin: '0 auto', padding: '160px 32px 100px' }}>
          
          <div className="hero-badge fade-in">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)', display: 'block', animation: 'glow-pulse 2s infinite', flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: 'var(--accent-cyan)', fontWeight: 600 }}>🟢 Checking in every 60 seconds</span>
          </div>

          <h1 className="fade-in" style={{
            fontSize: 'clamp(42px, 7vw, 84px)',
            fontWeight: 900, lineHeight: 1.08,
            marginBottom: 28, animationDelay: '0.1s',
            color: 'white',
            textShadow: '0 4px 30px rgba(0,0,0,0.5)'
          }}>
            Your website's
            <br />
            <span className="gradient-text">trusty companion</span>
          </h1>

          <p className="fade-in" style={{
            fontSize: 20, color: 'rgba(200,220,255,0.85)',
            maxWidth: 640, margin: '0 auto 48px',
            lineHeight: 1.75, animationDelay: '0.2s', fontWeight: 300,
            textShadow: '0 2px 10px rgba(0,0,0,0.4)'
          }}>
            Keep an eye on your sites, APIs, and services without the stress. We'll send you a friendly alert if anything needs your attention.
          </p>

          <div className="fade-in" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', animationDelay: '0.3s' }}>
            <Link href="/register" className="btn-primary" style={{
              textDecoration: 'none', fontSize: 17, padding: '16px 36px', borderRadius: 100,
              boxShadow: '0 8px 32px rgba(14,165,233,0.5)'
            }}>
              Start Monitoring Free <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="btn-secondary" style={{
              textDecoration: 'none', fontSize: 17, padding: '16px 36px', borderRadius: 100
            }}>
              Sign In
            </Link>
          </div>

          {/* Floating stat pills */}
          <div className="fade-in" style={{
            display: 'flex', gap: 14, justifyContent: 'center', marginTop: 48, flexWrap: 'wrap',
            animationDelay: '0.5s'
          }}>
            {[
              { icon: '✅', label: '99.9% Uptime', color: '#34d399' },
              { icon: '⚡', label: '< 60s Detection', color: '#fbbf24' },
              { icon: '🔔', label: 'Instant Alerts', color: '#38bdf8' },
            ].map(p => (
              <div key={p.label} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(10, 20, 55, 0.55)',
                border: `1px solid ${p.color}30`,
                borderRadius: 100, padding: '8px 18px',
                backdropFilter: 'blur(12px)',
                fontSize: 13, fontWeight: 600, color: p.color
              }}>
                <span>{p.icon}</span> {p.label}
              </div>
            ))}
          </div>
        </section>

        {/* ── Live Stats Preview ── */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px 80px' }}>
          {/* Stat tile row — matching reference image */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 32 }} className="fade-in">
            {[
              { cls: 'stat-tile-green', icon: '▲', label: 'Up Sites', value: '32', sub: 'ONLINE' },
              { cls: 'stat-tile-red', icon: '▼', label: 'Down Sites', value: '3', sub: 'OFFLINE' },
              { cls: 'stat-tile-amber', icon: '⚡', label: 'Avg Response', value: '620ms', sub: 'SPEED' },
              { cls: 'stat-tile-purple', icon: '🛡', label: 'Uptime', value: '99.8%', sub: 'PAST 30 DAYS' },
            ].map(tile => (
              <div key={tile.label} className={`stat-tile ${tile.cls}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>{tile.icon}</span>
                  <span className="tile-label">{tile.label}</span>
                </div>
                <div className="tile-value">{tile.value}</div>
                <div className="tile-sub">{tile.sub}</div>
              </div>
            ))}
          </div>

          {/* Mock dashboard card */}
          <div className="fade-in lively-card" style={{
            overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
          }}>
            {/* Fake browser bar */}
            <div style={{
              background: 'rgba(8,14,40,0.8)', padding: '16px 24px',
              display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: '1px solid rgba(120,160,255,0.12)'
            }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {['#fb7185','#fbbf24','#34d399'].map(c => (
                  <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
                ))}
              </div>
              <div style={{
                flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 12,
                padding: '8px 16px', fontSize: 13, color: 'var(--text-muted)'
              }}>
                uptimepulse-rd95.vercel.app/dashboard
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: 'var(--accent-green)', fontWeight: 600
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-green)', animation: 'glow-pulse 2s infinite', display: 'block' }} />
                LIVE
              </div>
            </div>
            {/* Mock monitors */}
            <div style={{ padding: 28 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {[
                  { name: 'api.myapp.com', status: 'All Good', time: '142ms', uptime: '99.98%', up: true },
                  { name: 'dashboard.myapp.com', status: 'All Good', time: '89ms', uptime: '100%', up: true },
                  { name: 'checkout.myapp.com', status: 'Needs Attention', time: '—', uptime: '97.2%', up: false },
                  { name: 'cdn.myapp.com', status: 'All Good', time: '23ms', uptime: '99.99%', up: true },
                ].map(m => (
                  <div key={m.name} style={{
                    background: m.up ? 'rgba(52,211,153,0.06)' : 'rgba(251,113,133,0.06)',
                    border: `1px solid ${m.up ? 'rgba(52,211,153,0.2)' : 'rgba(251,113,133,0.2)'}`,
                    borderRadius: 16, padding: '18px 20px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div className={m.up ? 'status-dot-up' : 'status-dot-down'} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: m.up ? 'var(--accent-green)' : 'var(--accent-red)', marginBottom: 4 }}>{m.status}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.time} · {m.uptime} uptime</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px 100px' }}>
          <h2 style={{ textAlign: 'center', fontSize: 40, fontWeight: 800, marginBottom: 16, color: 'white', textShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
            Everything you need to sleep soundly
          </h2>
          <p style={{ textAlign: 'center', color: 'rgba(200,220,255,0.7)', marginBottom: 64, fontSize: 18, fontWeight: 300 }}>
            Friendly tools that do the heavy lifting for you
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {[
              { icon: <Zap size={24} />, title: 'Smart Retries', desc: 'We double-check network blips before sending an alert, so you only get pinged when it matters.', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
              { icon: <Shield size={24} />, title: 'Gentle on Servers', desc: "We use lightweight requests that won't bog down your bandwidth.", color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
              { icon: <Globe size={24} />, title: 'Visual History', desc: 'Beautiful charts help you spot slowdowns before they turn into real problems.', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
              { icon: <Activity size={24} />, title: 'Friendly Alerts', desc: 'Instant email notifications the moment something needs your attention.', color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
            ].map(f => (
              <div key={f.title} className="lively-card" style={{ padding: 32 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: f.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', marginBottom: 20, color: f.color,
                  border: `1px solid ${f.color}25`
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: 'white' }}>{f.title}</h3>
                <p style={{ fontSize: 15, color: 'rgba(180,200,240,0.8)', lineHeight: 1.6, fontWeight: 300 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{ maxWidth: 800, margin: '0 auto', padding: '0 32px 140px', textAlign: 'center' }}>
          <div style={{
            background: 'rgba(8, 18, 50, 0.6)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(56,189,248,0.25)',
            borderRadius: 36, padding: '72px 48px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)'
          }}>
            <h2 style={{ fontSize: 42, fontWeight: 900, marginBottom: 18, color: 'white', textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              Start your peaceful<br /><span className="gradient-text">monitoring journey</span>
            </h2>
            <p style={{ color: 'rgba(180,210,255,0.75)', marginBottom: 44, fontSize: 18, fontWeight: 300 }}>
              No credit card required. Watch up to 10 places for free.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center', marginBottom: 44 }}>
              {['Unlimited checks', 'Email alerts', 'Response charts', 'Friendly dashboard'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle size={18} color="var(--accent-green)" />
                  <span style={{ color: 'rgba(200,220,255,0.85)', fontSize: 15 }}>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/register" className="btn-primary" style={{
              textDecoration: 'none', fontSize: 17, padding: '18px 44px', borderRadius: 100,
              boxShadow: '0 12px 40px rgba(14,165,233,0.5)'
            }}>
              Create Free Account <ChevronRight size={18} />
            </Link>
          </div>
        </section>
        
      </div>
    </div>
  )
}
