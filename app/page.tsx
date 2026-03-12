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
        <div className="fade-in" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 100, padding: '6px 16px', marginBottom: 32 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)', display: 'block', animation: 'glow-pulse 2s infinite' }} />
          <span style={{ fontSize: 13, color: 'var(--accent-blue)', fontWeight: 500 }}>Live monitoring — checks every 60 seconds</span>
        </div>

        <h1 className="fade-in" style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 24, animationDelay: '0.1s' }}>
          Never miss a
          <br />
          <span className="gradient-text">downtime event</span> again
        </h1>

        <p className="fade-in" style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.7, animationDelay: '0.2s' }}>
          Monitor your websites, APIs, and services 24/7. Get instant alerts via email when something goes down. Track response times and uptime history.
        </p>

        <div className="fade-in" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', animationDelay: '0.3s' }}>
          <Link href="/register" className="btn-primary" style={{ textDecoration: 'none', fontSize: 16, padding: '14px 28px' }}>
            Start Monitoring Free <ArrowRight size={16} />
          </Link>
          <Link href="/login" className="btn-secondary" style={{ textDecoration: 'none', fontSize: 16, padding: '14px 28px' }}>
            Sign In
          </Link>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px 80px' }}>
        <div className="fade-in" style={{
          borderRadius: 20, overflow: 'hidden',
          border: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}>
          {/* Fake browser bar */}
          <div style={{ background: 'var(--bg-card)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['#ef4444','#f59e0b','#22c55e'].map(c => (
                <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c, opacity: 0.8 }} />
              ))}
            </div>
            <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
              app.uptimepulse.io/dashboard
            </div>
          </div>
          {/* Mock dashboard */}
          <div style={{ padding: 28 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
              {[
                { name: 'api.myapp.com', status: 'UP', time: '142ms', uptime: '99.98%' },
                { name: 'dashboard.myapp.com', status: 'UP', time: '89ms', uptime: '100%' },
                { name: 'checkout.myapp.com', status: 'DOWN', time: '—', uptime: '97.2%' },
                { name: 'cdn.myapp.com', status: 'UP', time: '23ms', uptime: '99.99%' },
              ].map((m) => (
                <div key={m.name} className="card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div className={m.status === 'UP' ? 'status-dot-up' : 'status-dot-down'} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{m.name}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: m.status === 'UP' ? 'var(--accent-green)' : 'var(--accent-red)', marginBottom: 4 }}>{m.status}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.time} · {m.uptime}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px 100px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, marginBottom: 16 }}>
          Everything you need to monitor
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 56, fontSize: 16 }}>
          Production-grade monitoring features without the enterprise price tag
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
          {[
            { icon: <Zap size={24} />, title: '3-Strike Retries', desc: 'Checks 3 times before marking down. No false positives from network blips.', color: '#f59e0b' },
            { icon: <Shield size={24} />, title: 'HEAD Request Optimization', desc: 'Efficient bandwidth-saving HEAD requests instead of full GET downloads.', color: '#3b82f6' },
            { icon: <Globe size={24} />, title: 'Response Time Timeline', desc: 'Historical response time charts to spot degradation before it becomes an outage.', color: '#8b5cf6' },
            { icon: <Activity size={24} />, title: 'Instant Email Alerts', desc: 'Get notified the moment a service goes down and when it recovers.', color: '#22c55e' },
          ].map((f) => (
            <div key={f.title} className="card" style={{ padding: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `${f.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: f.color }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '0 32px 120px', textAlign: 'center' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 24, padding: '56px 40px' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16 }}>Start monitoring for free</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>No credit card required. Monitor up to 10 services.</p>
          {['Unlimited uptime checks', 'Email alerts included', 'Response time charts', 'Embeddable status badges'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, justifyContent: 'center' }}>
              <CheckCircle size={16} color="var(--accent-green)" />
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{f}</span>
            </div>
          ))}
          <Link href="/register" className="btn-primary" style={{ textDecoration: 'none', marginTop: 24, fontSize: 16, padding: '14px 32px' }}>
            Create Free Account <ChevronRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  )
}
