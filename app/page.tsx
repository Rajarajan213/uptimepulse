'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Activity, Zap, Shield, Globe, ChevronRight, CheckCircle, ArrowRight } from 'lucide-react'

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
      <div style={{ width: 40, height: 40, border: '3px solid var(--border-light)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '-200px', left: '50%', transform: 'translateX(-50%)',
        width: '800px', height: '600px',
        background: 'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Navbar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }} className="glass-darker">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={20} color="white" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Uptime<span className="gradient-text">Pulse</span></span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/login" className="btn-secondary" style={{ textDecoration: 'none' }}>Sign In</Link>
          <Link href="/register" className="btn-primary" style={{ textDecoration: 'none' }}>Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 160, paddingBottom: 100, textAlign: 'center', maxWidth: 900, margin: '0 auto', padding: '160px 32px 100px' }}>
        <div className="fade-in" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: 100, padding: '8px 18px', marginBottom: 32 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)', display: 'block', animation: 'glow-pulse 2.5s infinite' }} />
          <span style={{ fontSize: 14, color: 'var(--accent-blue)', fontWeight: 500 }}>Checking in every 60 seconds</span>
        </div>

        <h1 className="fade-in" style={{ fontSize: 'clamp(40px, 6vw, 76px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 24, animationDelay: '0.1s' }}>
          Your website's
          <br />
          <span className="gradient-text">trusty companion</span>
        </h1>

        <p className="fade-in" style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 640, margin: '0 auto 40px', lineHeight: 1.7, animationDelay: '0.2s', fontWeight: 300 }}>
          Keep an eye on your sites, APIs, and services without the stress. We'll send you a friendly alert if anything needs your attention.
        </p>

        <div className="fade-in" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', animationDelay: '0.3s' }}>
          <Link href="/register" className="btn-primary" style={{ textDecoration: 'none', fontSize: 16, padding: '16px 32px', borderRadius: 100 }}>
            Start Monitoring Free <ArrowRight size={18} />
          </Link>
          <Link href="/login" className="btn-secondary" style={{ textDecoration: 'none', fontSize: 16, padding: '16px 32px', borderRadius: 100 }}>
            Sign In
          </Link>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px 80px' }}>
        <div className="fade-in" style={{
          borderRadius: 24, overflow: 'hidden',
          border: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
        }}>
          {/* Fake browser bar */}
          <div style={{ background: 'var(--bg-card)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['#f43f5e','#f59e0b','#10b981'].map(c => (
                <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c, opacity: 0.9 }} />
              ))}
            </div>
            <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 12, padding: '8px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
              app.uptimepulse.io/dashboard
            </div>
          </div>
          {/* Mock dashboard */}
          <div style={{ padding: 32 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 24 }}>
              {[
                { name: 'api.myapp.com', status: 'All Good', time: '142ms', uptime: '99.98%', up: true },
                { name: 'dashboard.myapp.com', status: 'All Good', time: '89ms', uptime: '100%', up: true },
                { name: 'checkout.myapp.com', status: 'Needs Attention', time: '—', uptime: '97.2%', up: false },
                { name: 'cdn.myapp.com', status: 'All Good', time: '23ms', uptime: '99.99%', up: true },
              ].map((m) => (
                <div key={m.name} className="card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div className={m.up ? 'status-dot-up' : 'status-dot-down'} style={{ width: 12, height: 12 }} />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{m.name}</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: m.up ? 'var(--text-primary)' : 'var(--accent-red)', marginBottom: 6 }}>{m.status}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{m.time} · {m.uptime} uptime</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px 100px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 40, fontWeight: 800, marginBottom: 16 }}>
          Everything you need to sleep soundly
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 64, fontSize: 18, fontWeight: 300 }}>
          Friendly tools that do the heavy lifting for you
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
          {[
            { icon: <Zap size={24} />, title: 'Smart Retries', desc: 'We double-check network blips before sending an alert, so you only get pinged when it matters.', color: '#f59e0b' },
            { icon: <Shield size={24} />, title: 'Gentle on Servers', desc: 'We use lightweight requests that won\'t bog down your bandwidth.', color: '#0ea5e9' },
            { icon: <Globe size={24} />, title: 'Visual History', desc: 'Beautiful charts help you spot slowdowns before they turn into real problems.', color: '#8b5cf6' },
            { icon: <Activity size={24} />, title: 'Friendly Alerts', desc: 'Instant email notifications the moment something needs your attention.', color: '#10b981' },
          ].map((f) => (
            <div key={f.title} className="card" style={{ padding: 32 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: `${f.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, color: f.color }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 300 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '0 32px 120px', textAlign: 'center' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(99,102,241,0.1))', border: '1px solid rgba(14,165,233,0.2)', borderRadius: 32, padding: '64px 40px' }}>
          <h2 style={{ fontSize: 40, fontWeight: 800, marginBottom: 16 }}>Start your peaceful monitoring</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 40, fontSize: 18, fontWeight: 300 }}>No credit card required. Watch up to 10 places for free.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center', marginBottom: 40 }}>
            {['Unlimited checks', 'Email alerts', 'Response charts', 'Friendly dashboard'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={18} color="var(--accent-green)" />
                <span style={{ color: 'var(--text-secondary)', fontSize: 15 }}>{f}</span>
              </div>
            ))}
          </div>
          <Link href="/register" className="btn-primary" style={{ textDecoration: 'none', fontSize: 16, padding: '16px 40px', borderRadius: 100 }}>
            Create Free Account <ChevronRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  )
}
