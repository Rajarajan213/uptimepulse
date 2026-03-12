'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Activity, Trophy, ArrowLeft, Flame, Star, Target,
  Zap, Shield, Globe, Clock, TrendingUp, RefreshCw
} from 'lucide-react'
import {
  calculateXP, calculateStreaks, calculateAchievements,
  calculateBossBattles, getRank, aggregateProfile,
  type Heartbeat, type MonitorStats, type BossBattle
} from '@/lib/gamification'
import { formatDistanceToNow } from 'date-fns'

// ─── XP Bar Component ────────────────────────────────────────
function XPBar({ xp, level, progressPercent, xpToNextLevel, color = '#38bdf8' }: {
  xp: number, level: number, progressPercent: number, xpToNextLevel: number, color?: string
}) {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Level {level}</span>
        <span style={{ fontSize: 12, color: 'rgba(200,220,255,0.7)' }}>{xp.toLocaleString()} XP · {xpToNextLevel} to next</span>
      </div>
      <div style={{ height: 10, borderRadius: 100, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{
          height: '100%', borderRadius: 100,
          background: `linear-gradient(90deg, ${color}, ${color}aa)`,
          width: `${progressPercent}%`,
          transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: `0 0 12px ${color}80`
        }} />
      </div>
    </div>
  )
}

// ─── Rank Badge ──────────────────────────────────────────────
function RankBadge({ uptime, large = false }: { uptime: number | null, large?: boolean }) {
  const rank = getRank(uptime)
  return (
    <div style={{
      display: 'inline-flex', flexDirection: large ? 'column' : 'row',
      alignItems: 'center', gap: large ? 6 : 8,
      background: `${rank.color}15`,
      border: `1px solid ${rank.color}40`,
      borderRadius: large ? 16 : 100,
      padding: large ? '14px 20px' : '4px 12px',
    }}>
      <span style={{ fontSize: large ? 36 : 16 }}>{rank.emoji}</span>
      <div style={{ textAlign: large ? 'center' : 'left' }}>
        <div style={{ fontSize: large ? 18 : 12, fontWeight: 800, color: rank.color }}>{rank.tier}</div>
        {large && <div style={{ fontSize: 12, color: 'rgba(200,220,255,0.6)' }}>{rank.reason}</div>}
      </div>
    </div>
  )
}

// ─── Boss Battle Card ────────────────────────────────────────
function BossCard({ battle }: { battle: BossBattle }) {
  const isOngoing = battle.status === 'Ongoing'
  const color = isOngoing ? '#f43f5e' : battle.status === 'Defeated' ? '#34d399' : '#fbbf24'
  const recoverySecs = battle.recoveryMs ? Math.round(battle.recoveryMs / 1000) : null

  return (
    <div style={{
      background: isOngoing ? 'rgba(244,63,94,0.08)' : 'rgba(10,22,55,0.6)',
      border: `1px solid ${color}30`,
      borderRadius: 20, padding: '22px 24px',
      backdropFilter: 'blur(16px)',
      position: 'relative', overflow: 'hidden',
      animation: isOngoing ? 'pulse-ring-red 3s infinite' : undefined,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: color, marginBottom: 4 }}>
            {isOngoing ? '⚠️ ACTIVE INCIDENT BOSS' : `⚔️ BOSS ${battle.status.toUpperCase()}`}
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'white' }}>{battle.bossName}</div>
          <div style={{ fontSize: 12, color: 'rgba(160,190,240,0.7)', marginTop: 2 }}>
            🌐 {battle.monitorName} · {formatDistanceToNow(new Date(battle.startedAt), { addSuffix: true })}
          </div>
        </div>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: `${color}20`, border: `2px solid ${color}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26
        }}>
          {isOngoing ? '👹' : battle.status === 'Defeated' ? '🏆' : '✔️'}
        </div>
      </div>

      {/* Health bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(200,220,255,0.7)', textTransform: 'uppercase' }}>Boss Health</span>
          <span style={{ fontSize: 12, fontWeight: 700, color }}>{isOngoing ? `${battle.health}%` : '0%'}</span>
        </div>
        <div style={{ height: 10, borderRadius: 100, background: 'rgba(255,255,255,0.06)' }}>
          <div style={{
            height: '100%', borderRadius: 100,
            background: isOngoing ? 'linear-gradient(90deg,#ef4444,#dc2626)' : 'rgba(255,255,255,0.1)',
            width: isOngoing ? `${battle.health}%` : '0%',
            transition: 'width 1s ease',
            boxShadow: isOngoing ? '0 0 10px rgba(244,63,94,0.6)' : undefined,
          }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'rgba(160,190,240,0.6)', marginBottom: 8, fontWeight: 600 }}>RECOVERY ACTIONS</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {battle.actions.map((action, i) => (
            <span key={i} style={{
              fontSize: 11, fontWeight: 600,
              background: `${color}15`, border: `1px solid ${color}30`,
              color, borderRadius: 8, padding: '3px 10px',
              display: 'flex', alignItems: 'center', gap: 4
            }}>
              ✔ {action}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      {!isOngoing && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '12px 16px', borderRadius: 12,
          background: `${color}10`, border: `1px solid ${color}20`
        }}>
          <span style={{ fontSize: 20 }}>🏆</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color }}>Boss Defeated!</div>
            <div style={{ fontSize: 12, color: 'rgba(160,190,240,0.7)' }}>
              +{battle.xpEarned} XP earned {recoverySecs !== null && `· Recovered in ${recoverySecs}s`}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────
export default function GamificationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [monitorsStats, setMonitorsStats] = useState<MonitorStats[]>([])
  const [bossBattles, setBossBattles] = useState<BossBattle[]>([])
  const [activeTab, setActiveTab] = useState<'xp' | 'streaks' | 'achievements' | 'bosses'>('xp')

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: monitors } = await supabase
      .from('monitors').select('*').eq('user_id', user.id)

    if (!monitors) { setLoading(false); return }

    const stats: MonitorStats[] = []
    const allBattles: BossBattle[] = []

    await Promise.all(monitors.map(async (m) => {
      const { data: hb } = await supabase
        .from('heartbeats')
        .select('status,response_time,created_at')
        .eq('monitor_id', m.id)
        .order('created_at', { ascending: false })
        .limit(500)

      const heartbeats: Heartbeat[] = (hb || []).map(h => ({
        status: h.status as 'UP' | 'DOWN',
        response_time: h.response_time,
        created_at: h.created_at,
      }))

      const upCount = heartbeats.filter(h => h.status === 'UP').length
      const total = heartbeats.length
      const uptimePercentage = total > 0 ? Math.round((upCount / total) * 1000) / 10 : null
      const avgResponseTime = heartbeats.length > 0
        ? Math.round(heartbeats.reduce((a, h) => a + (h.response_time ?? 0), 0) / heartbeats.length)
        : null

      stats.push({ monitorId: m.id, monitorName: m.name, heartbeats, uptimePercentage, avgResponseTime })
      allBattles.push(...calculateBossBattles(m.name, heartbeats))
    }))

    setMonitorsStats(stats)
    setBossBattles(allBattles.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, 8))
    setLoading(false)
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  const profile = aggregateProfile(monitorsStats)

  const TABS = [
    { id: 'xp',           label: '⚡ XP & Ranks',    icon: <Star size={15} /> },
    { id: 'streaks',      label: '🔥 Streaks',         icon: <Flame size={15} /> },
    { id: 'achievements', label: '🏆 Achievements',    icon: <Trophy size={15} /> },
    { id: 'bosses',       label: '👹 Boss Battles',    icon: <Shield size={15} /> },
  ] as const

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Background */}
      <div className="scene-bg">
        <div className="cloud cloud-1" />
        <div className="cloud cloud-2" />
        <div className="cloud cloud-3" />
        <div className="orb orb-blue" />
        <div className="orb orb-purple" />
        <div className="orb orb-cyan" />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <header style={{
          background: 'rgba(4,8,28,0.80)', backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderBottom: '1px solid rgba(120,160,255,0.14)',
          padding: '0 32px', position: 'sticky', top: 0, zIndex: 40
        }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(160,190,240,0.8)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
                <ArrowLeft size={16} /> Dashboard
              </Link>
              <div style={{ width: 1, height: 20, background: 'rgba(120,160,255,0.2)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'linear-gradient(135deg, #f97316, #a855f7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(249,115,22,0.4)'
                }}>
                  <Trophy size={20} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>
                    🎮 Reliability Game
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(160,190,240,0.6)', fontWeight: 500 }}>Turn monitoring into mastery</div>
                </div>
              </div>
            </div>
            <button onClick={fetchData} className="btn-secondary" style={{ borderRadius: 12, padding: '10px' }}>
              <RefreshCw size={16} style={{ animation: loading ? 'spin-slow 0.8s linear infinite' : 'none' }} />
            </button>
          </div>
        </header>

        <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px' }}>

          {/* ── Profile Hero ── */}
          <div className="lively-card fade-in" style={{ padding: '36px 40px', marginBottom: 40, position: 'relative', overflow: 'hidden' }}>
            {/* Decorative background */}
            <div style={{ position: 'absolute', right: -60, top: -60, width: 300, height: 300, borderRadius: '50%', background: `${profile.topRank.color}08`, pointerEvents: 'none' }} />

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 32, position: 'relative' }}>
              {/* Rank display */}
              <div style={{
                width: 100, height: 100, borderRadius: 24,
                background: profile.topRank.gradient,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 8px 32px ${profile.topRank.color}50`, flexShrink: 0
              }}>
                <span style={{ fontSize: 44 }}>{profile.topRank.emoji}</span>
              </div>

              <div style={{ flex: 1, minWidth: 250 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>
                    Level {profile.level} Reliability Engineer
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: profile.topRank.color,
                    background: `${profile.topRank.color}18`, border: `1px solid ${profile.topRank.color}35`,
                    borderRadius: 8, padding: '3px 10px'
                  }}>
                    {profile.topRank.tier} Tier
                  </span>
                </div>
                <div style={{ color: 'rgba(180,210,255,0.7)', fontSize: 15, marginBottom: 20, fontWeight: 300 }}>
                  {profile.totalXP.toLocaleString()} total XP · {profile.earnedCount} achievements · {profile.totalUptimeStreak}🔥 day streak
                </div>
                <XPBar
                  xp={profile.totalXP}
                  level={profile.level}
                  progressPercent={profile.progressPercent}
                  xpToNextLevel={profile.xpToNextLevel}
                  color={profile.topRank.color}
                />
              </div>

              {/* Quick stats */}
              <div style={{ display: 'flex', gap: 16 }}>
                {[
                  { label: 'Monitors', value: monitorsStats.length, color: '#38bdf8', icon: <Globe size={18} /> },
                  { label: 'Achievements', value: `${profile.earnedCount}/${profile.achievements.length}`, color: '#fbbf24', icon: <Trophy size={18} /> },
                  { label: 'Day Streak', value: `${profile.totalUptimeStreak}🔥`, color: '#f97316', icon: <Flame size={18} /> },
                ].map(s => (
                  <div key={s.label} style={{
                    textAlign: 'center', padding: '16px 20px',
                    background: `${s.color}10`, border: `1px solid ${s.color}25`,
                    borderRadius: 16, minWidth: 80
                  }}>
                    <div style={{ color: s.color, marginBottom: 6 }}>{s.icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: 'rgba(160,190,240,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Tab Bar ── */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 100,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: activeTab === tab.id
                    ? 'linear-gradient(135deg, #38bdf8, #818cf8)'
                    : 'rgba(255,255,255,0.05)',
                  color: activeTab === tab.id ? 'white' : 'rgba(160,190,240,0.7)',
                  boxShadow: activeTab === tab.id ? '0 4px 16px rgba(56,189,248,0.3)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ── Loading ── */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 220, borderRadius: 20 }} />)}
            </div>
          ) : monitorsStats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 32px' }}>
              <Trophy size={52} color="var(--accent-blue)" style={{ marginBottom: 16, opacity: 0.6 }} />
              <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10, color: 'white' }}>No monitors yet</h3>
              <p style={{ color: 'rgba(160,190,240,0.7)', marginBottom: 24 }}>Add some monitors to start earning XP and ranks!</p>
              <Link href="/dashboard" className="btn-primary" style={{ textDecoration: 'none' }}>← Go to Dashboard</Link>
            </div>
          ) : (
            <>
              {/* ── XP & Ranks Tab ── */}
              {activeTab === 'xp' && (
                <div className="fade-in">
                  <div style={{ marginBottom: 20 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 6 }}>⚡ Reliability XP — Per Monitor</h2>
                    <p style={{ color: 'rgba(160,190,240,0.65)', fontSize: 14 }}>Each site earns XP for staying online, recovering fast, and maintaining stability.</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}>
                    {monitorsStats.map((m, i) => {
                      const xp = calculateXP(m.heartbeats)
                      const rank = getRank(m.uptimePercentage)
                      return (
                        <div key={m.monitorId} className="lively-card fade-in" style={{ padding: 28, animationDelay: `${i * 0.07}s` }}>
                          {/* Rank + name */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                            <div>
                              <div style={{ fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 4 }}>{m.monitorName}</div>
                              <div style={{ fontSize: 12, color: 'rgba(160,190,240,0.6)' }}>
                                Uptime: {m.uptimePercentage !== null ? `${m.uptimePercentage}%` : '—'}
                              </div>
                            </div>
                            <div style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center',
                              background: `${rank.color}15`, border: `1px solid ${rank.color}35`,
                              borderRadius: 14, padding: '8px 16px', gap: 2
                            }}>
                              <span style={{ fontSize: 28 }}>{rank.emoji}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: rank.color }}>{rank.tier}</span>
                            </div>
                          </div>

                          {/* XP Bar */}
                          <XPBar
                            xp={xp.xp}
                            level={xp.level}
                            progressPercent={xp.progressPercent}
                            xpToNextLevel={xp.xpToNextLevel}
                            color={rank.color}
                          />

                          {/* Stats */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 20 }}>
                            {[
                              { label: 'Total XP', value: xp.xp.toLocaleString(), color: rank.color },
                              { label: 'Level', value: `Lv.${xp.level}`, color: '#38bdf8' },
                              { label: 'Avg Speed', value: m.avgResponseTime ? `${m.avgResponseTime}ms` : '—', color: '#34d399' },
                            ].map(s => (
                              <div key={s.label} style={{
                                textAlign: 'center', padding: '10px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(120,160,255,0.1)', borderRadius: 12
                              }}>
                                <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: 10, color: 'rgba(160,190,240,0.5)', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* XP rules reference */}
                  <div className="lively-card" style={{ padding: 28, marginTop: 32 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 16 }}>📋 XP Rules</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                      {[
                        { event: '24h without downtime', xp: '+50 XP', color: '#34d399' },
                        { event: 'Fast recovery (<1 min)', xp: '+20 XP', color: '#38bdf8' },
                        { event: 'Zero false alerts (day)', xp: '+10 XP', color: '#a78bfa' },
                        { event: 'Downtime event', xp: '−40 XP', color: '#f43f5e' },
                        { event: 'Repeated outage', xp: '−25 XP', color: '#fb923c' },
                      ].map(r => (
                        <div key={r.event} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(120,160,255,0.1)', borderRadius: 12
                        }}>
                          <span style={{ fontSize: 12, color: 'rgba(180,210,255,0.75)' }}>{r.event}</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: r.color }}>{r.xp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Streaks Tab ── */}
              {activeTab === 'streaks' && (
                <div className="fade-in">
                  <div style={{ marginBottom: 20 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 6 }}>🔥 Streaks — Build Unstoppable Momentum</h2>
                    <p style={{ color: 'rgba(160,190,240,0.65)', fontSize: 14 }}>Consecutive excellence. Breaking a streak hurts your XP — protect them!</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
                    {monitorsStats.map((m, i) => {
                      const streaks = calculateStreaks(m.heartbeats)
                      return (
                        <div key={m.monitorId} className="lively-card fade-in" style={{ padding: 28, animationDelay: `${i * 0.07}s` }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 20 }}>🌐 {m.monitorName}</div>
                          {[
                            { emoji: '🔥', label: 'Uptime Streak', value: streaks.uptimeStreak, unit: 'days', color: '#f97316', desc: 'Consecutive days without downtime' },
                            { emoji: '⚡', label: 'Fast Recovery Streak', value: streaks.fastRecoveryStreak, unit: 'incidents', color: '#fbbf24', desc: 'Consecutive recoveries under 60s' },
                            { emoji: '🧹', label: 'Zero-Alert Streak', value: streaks.zeroAlertStreak, unit: 'days', color: '#34d399', desc: 'Days with no DOWN events at all' },
                          ].map(s => (
                            <div key={s.label} style={{
                              display: 'flex', alignItems: 'center', gap: 16,
                              padding: '14px 16px', marginBottom: 10,
                              background: s.value > 0 ? `${s.color}10` : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${s.value > 0 ? s.color + '30' : 'rgba(120,160,255,0.08)'}`,
                              borderRadius: 14,
                            }}>
                              <span style={{ fontSize: 28, flexShrink: 0 }}>{s.emoji}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: s.value > 0 ? 'white' : 'rgba(160,190,240,0.5)', marginBottom: 2 }}>
                                  {s.label}
                                </div>
                                <div style={{ fontSize: 11, color: 'rgba(140,170,220,0.5)' }}>{s.desc}</div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: 28, fontWeight: 900, color: s.value > 0 ? s.color : 'rgba(160,190,240,0.25)', lineHeight: 1 }}>
                                  {s.value}
                                </div>
                                <div style={{ fontSize: 10, color: 'rgba(140,170,220,0.5)', fontWeight: 600 }}>{s.unit}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Achievements Tab ── */}
              {activeTab === 'achievements' && (
                <div className="fade-in">
                  <div style={{ marginBottom: 20 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 6 }}>🏆 Achievements & Badges</h2>
                    <p style={{ color: 'rgba(160,190,240,0.65)', fontSize: 14 }}>
                      {profile.earnedCount} of {profile.achievements.length} earned · Locked achievements are shown grayed out
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                    {profile.achievements.map((a, i) => (
                      <div key={a.id} className="lively-card fade-in" style={{
                        padding: 24, animationDelay: `${i * 0.06}s`,
                        opacity: a.earned ? 1 : 0.45,
                        filter: a.earned ? 'none' : 'grayscale(60%)',
                        border: a.earned ? `1px solid ${a.color}35` : undefined,
                        boxShadow: a.earned ? `0 0 20px ${a.color}15` : 'none',
                        position: 'relative', overflow: 'hidden',
                      }}>
                        {/* Rarity badge */}
                        <div style={{
                          position: 'absolute', top: 14, right: 14,
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                          color: a.earned ? a.color : 'rgba(160,190,240,0.3)',
                          background: a.earned ? `${a.color}15` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${a.earned ? a.color + '30' : 'rgba(120,160,255,0.1)'}`,
                          borderRadius: 6, padding: '2px 8px',
                          textTransform: 'uppercase',
                        }}>{a.rarity}</div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                          <div style={{
                            width: 60, height: 60, borderRadius: 18,
                            background: a.earned ? `${a.color}20` : 'rgba(255,255,255,0.04)',
                            border: `2px solid ${a.earned ? a.color + '50' : 'rgba(120,160,255,0.1)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 30,
                            boxShadow: a.earned ? `0 0 20px ${a.color}30` : 'none',
                          }}>
                            {a.emoji}
                          </div>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: a.earned ? 'white' : 'rgba(160,190,240,0.5)', marginBottom: 4 }}>
                              {a.title}
                            </div>
                            <div style={{ fontSize: 12, color: 'rgba(140,170,220,0.6)', lineHeight: 1.5 }}>{a.description}</div>
                          </div>
                        </div>

                        {a.earned && (
                          <div style={{
                            padding: '8px 14px', borderRadius: 10,
                            background: `${a.color}10`, border: `1px solid ${a.color}25`,
                            fontSize: 12, fontWeight: 600, color: a.color,
                            display: 'flex', alignItems: 'center', gap: 6
                          }}>
                            ✅ Achievement Unlocked!
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Boss Battles Tab ── */}
              {activeTab === 'bosses' && (
                <div className="fade-in">
                  <div style={{ marginBottom: 20 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 6 }}>👹 Reliability Boss Battles</h2>
                    <p style={{ color: 'rgba(160,190,240,0.65)', fontSize: 14 }}>Every downtime event becomes a boss fight. Defeat them fast to earn bonus XP!</p>
                  </div>

                  {bossBattles.length === 0 ? (
                    <div className="lively-card" style={{ padding: '60px 32px', textAlign: 'center' }}>
                      <span style={{ fontSize: 64 }}>🏆</span>
                      <h3 style={{ fontSize: 20, fontWeight: 700, color: 'white', marginTop: 16, marginBottom: 8 }}>No Bosses Encountered!</h3>
                      <p style={{ color: 'rgba(160,190,240,0.65)' }}>
                        Your sites have been perfectly stable. Keep up the amazing work!
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}>
                      {bossBattles.map((battle) => (
                        <BossCard key={battle.id + battle.startedAt} battle={battle} />
                      ))}
                    </div>
                  )}

                  {/* Boss battle legend */}
                  <div className="lively-card" style={{ padding: 24, marginTop: 32 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 14 }}>⚔️ How Boss Battles Work</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                      {[
                        { label: 'Downtime = Boss Spawn', color: '#f43f5e', emoji: '👹' },
                        { label: 'Recovery < 60s = Defeated', color: '#34d399', emoji: '🏆' },
                        { label: 'Slow recovery = Survived', color: '#fbbf24', emoji: '✔️' },
                        { label: 'Fast defeat = Bonus XP', color: '#a78bfa', emoji: '⚡' },
                      ].map(r => (
                        <div key={r.label} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px', background: `${r.color}08`,
                          border: `1px solid ${r.color}20`, borderRadius: 12
                        }}>
                          <span style={{ fontSize: 20 }}>{r.emoji}</span>
                          <span style={{ fontSize: 12, color: 'rgba(180,210,255,0.75)', fontWeight: 500 }}>{r.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
