// ============================================================
// UptimePulse — Gamification Engine
// All XP, ranks, streaks, achievements, and boss battles
// are computed purely from existing heartbeat data.
// ============================================================

export type Heartbeat = {
  status: 'UP' | 'DOWN'
  response_time: number | null
  created_at: string
}

export type MonitorStats = {
  monitorId: string
  monitorName: string
  heartbeats: Heartbeat[]
  uptimePercentage: number | null
  avgResponseTime: number | null
}

// ─── XP Rules ───────────────────────────────────────────────
const XP_24H_NO_DOWNTIME = 50
const XP_FAST_RECOVERY   = 20  // recovery < 1 min
const XP_ZERO_ALERTS     = 10  // no false alerts
const XP_DOWNTIME_PENALTY = 40
const XP_REPEAT_OUTAGE    = 25
const XP_PER_LEVEL        = 1000

// ─── Rank Thresholds ────────────────────────────────────────
export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Legendary'

export type Rank = {
  tier: RankTier
  emoji: string
  color: string
  gradient: string
  minUptime: number
  reason: string
}

export const RANKS: Record<RankTier, Rank> = {
  Bronze:    { tier: 'Bronze',    emoji: '🪵', color: '#cd7f32', gradient: 'linear-gradient(135deg,#cd7f32,#a0522d)', minUptime: 0,    reason: 'Getting started' },
  Silver:    { tier: 'Silver',    emoji: '🪙', color: '#c0c0c0', gradient: 'linear-gradient(135deg,#c0c0c0,#909090)', minUptime: 90,   reason: 'Mostly stable' },
  Gold:      { tier: 'Gold',      emoji: '🟡', color: '#ffd700', gradient: 'linear-gradient(135deg,#ffd700,#f59e0b)', minUptime: 97,   reason: 'Reliable' },
  Platinum:  { tier: 'Platinum',  emoji: '💎', color: '#66e0ff', gradient: 'linear-gradient(135deg,#66e0ff,#38bdf8)', minUptime: 99,   reason: 'Highly resilient' },
  Legendary: { tier: 'Legendary', emoji: '👑', color: '#f97316', gradient: 'linear-gradient(135deg,#f97316,#a855f7)', minUptime: 99.9, reason: 'Mission-critical ready' },
}

export function getRank(uptimePercentage: number | null): Rank {
  const pct = uptimePercentage ?? 0
  if (pct >= 99.9) return RANKS.Legendary
  if (pct >= 99)   return RANKS.Platinum
  if (pct >= 97)   return RANKS.Gold
  if (pct >= 90)   return RANKS.Silver
  return RANKS.Bronze
}

// ─── XP Calculation ─────────────────────────────────────────
export type XPResult = {
  xp: number
  level: number
  xpInCurrentLevel: number
  xpToNextLevel: number
  progressPercent: number
}

export function calculateXP(heartbeats: Heartbeat[]): XPResult {
  let xp = 0
  if (heartbeats.length === 0) return { xp: 0, level: 1, xpInCurrentLevel: 0, xpToNextLevel: XP_PER_LEVEL, progressPercent: 0 }

  // Group by day
  const byDay = new Map<string, Heartbeat[]>()
  heartbeats.forEach(h => {
    const day = h.created_at.slice(0, 10)
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(h)
  })

  byDay.forEach((dayBeats) => {
    const allUp = dayBeats.every(h => h.status === 'UP')
    if (allUp) {
      xp += XP_24H_NO_DOWNTIME
    } else {
      // Count downtime events
      const downtimes = dayBeats.filter(h => h.status === 'DOWN')
      xp -= XP_DOWNTIME_PENALTY
      if (downtimes.length > 1) xp -= XP_REPEAT_OUTAGE

      // Check fast recoveries (DOWN followed by UP quickly)
      for (let i = 0; i < dayBeats.length - 1; i++) {
        if (dayBeats[i].status === 'DOWN' && dayBeats[i + 1].status === 'UP') {
          const downTime = new Date(dayBeats[i].created_at).getTime()
          const upTime   = new Date(dayBeats[i + 1].created_at).getTime()
          const recoveryMs = upTime - downTime
          if (recoveryMs <= 60_000) xp += XP_FAST_RECOVERY
        }
      }
    }
    // Zero false alerts bonus (no DOWN events)
    if (allUp) xp += XP_ZERO_ALERTS
  })

  const totalXP = Math.max(0, xp)
  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1
  const xpInCurrentLevel = totalXP % XP_PER_LEVEL
  const xpToNextLevel = XP_PER_LEVEL - xpInCurrentLevel
  const progressPercent = Math.round((xpInCurrentLevel / XP_PER_LEVEL) * 100)

  return { xp: totalXP, level, xpInCurrentLevel, xpToNextLevel, progressPercent }
}

// ─── Streak Calculation ──────────────────────────────────────
export type Streaks = {
  uptimeStreak: number        // consecutive days without downtime
  fastRecoveryStreak: number  // consecutive incidents resolved <60s
  zeroAlertStreak: number     // consecutive days with no DOWN events
}

export function calculateStreaks(heartbeats: Heartbeat[]): Streaks {
  if (heartbeats.length === 0) return { uptimeStreak: 0, fastRecoveryStreak: 0, zeroAlertStreak: 0 }

  const sorted = [...heartbeats].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Uptime streak: count consecutive days (from today) with all UP
  const byDay = new Map<string, Heartbeat[]>()
  sorted.forEach(h => {
    const day = h.created_at.slice(0, 10)
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(h)
  })

  const days = Array.from(byDay.keys()).sort().reverse()
  let uptimeStreak = 0
  let zeroAlertStreak = 0

  for (const day of days) {
    const beats = byDay.get(day)!
    const allUp = beats.every(h => h.status === 'UP')
    if (allUp) {
      uptimeStreak++
      zeroAlertStreak++
    } else {
      break
    }
  }

  // Fast recovery streak: consecutive incidents recovered <60s
  let fastRecoveryStreak = 0
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].status === 'UP' && sorted[i + 1].status === 'DOWN') {
      const downTime = new Date(sorted[i + 1].created_at).getTime()
      const upTime   = new Date(sorted[i].created_at).getTime()
      const recoveryMs = upTime - downTime
      if (recoveryMs <= 60_000) {
        fastRecoveryStreak++
      } else {
        break
      }
    }
  }

  return { uptimeStreak, fastRecoveryStreak, zeroAlertStreak }
}

// ─── Achievements ────────────────────────────────────────────
export type Achievement = {
  id: string
  emoji: string
  title: string
  description: string
  earned: boolean
  color: string
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary'
}

export function calculateAchievements(
  heartbeats: Heartbeat[],
  streaks: Streaks,
  xpResult: XPResult,
  uptime: number | null
): Achievement[] {
  const pct = uptime ?? 0
  const byDay = new Map<string, Heartbeat[]>()
  heartbeats.forEach(h => {
    const day = h.created_at.slice(0, 10)
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(h)
  })

  // Days with no downtime
  let daysNoDowntime = 0
  Array.from(byDay.values()).forEach(beats => {
    if (beats.every(h => h.status === 'UP')) daysNoDowntime++
  })

  // Fastest recovery time
  let fastestRecoveryMs = Infinity
  const sorted = [...heartbeats].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].status === 'DOWN' && sorted[i + 1].status === 'UP') {
      const ms = new Date(sorted[i + 1].created_at).getTime() - new Date(sorted[i].created_at).getTime()
      fastestRecoveryMs = Math.min(fastestRecoveryMs, ms)
    }
  }

  return [
    {
      id: 'iron_wall',
      emoji: '🛡️',
      title: 'Iron Wall',
      description: '30 days without any downtime',
      earned: daysNoDowntime >= 30,
      color: '#38bdf8',
      rarity: 'Epic',
    },
    {
      id: 'lightning_fixer',
      emoji: '⚡',
      title: 'Lightning Fixer',
      description: 'Recovered from downtime in under 30 seconds',
      earned: fastestRecoveryMs <= 30_000,
      color: '#fbbf24',
      rarity: 'Rare',
    },
    {
      id: 'clean_ops',
      emoji: '🧹',
      title: 'Clean Ops',
      description: '14 consecutive days with zero false alerts',
      earned: streaks.zeroAlertStreak >= 14,
      color: '#34d399',
      rarity: 'Rare',
    },
    {
      id: 'global_stable',
      emoji: '🌍',
      title: 'Global Stable',
      description: '99.9%+ uptime maintained',
      earned: pct >= 99.9,
      color: '#a78bfa',
      rarity: 'Legendary',
    },
    {
      id: 'first_blood',
      emoji: '🎯',
      title: 'First Monitor',
      description: 'Added your first website to monitor',
      earned: heartbeats.length > 0,
      color: '#fb923c',
      rarity: 'Common',
    },
    {
      id: 'reliability_veteran',
      emoji: '🎖️',
      title: 'Reliability Veteran',
      description: 'Reached Level 5 or higher',
      earned: xpResult.level >= 5,
      color: '#e879f9',
      rarity: 'Epic',
    },
    {
      id: 'comeback_king',
      emoji: '🔄',
      title: 'Comeback King',
      description: '5 consecutive fast recovery streaks',
      earned: streaks.fastRecoveryStreak >= 5,
      color: '#f43f5e',
      rarity: 'Rare',
    },
    {
      id: 'uptime_legend',
      emoji: '🔥',
      title: 'Uptime Legend',
      description: '17+ day uptime streak',
      earned: streaks.uptimeStreak >= 17,
      color: '#f97316',
      rarity: 'Legendary',
    },
  ]
}

// ─── Boss Battles ────────────────────────────────────────────
export type BossBattle = {
  id: string
  monitorName: string
  bossName: string
  startedAt: string
  resolvedAt: string | null
  recoveryMs: number | null
  status: 'Ongoing' | 'Defeated' | 'Survived'
  xpEarned: number
  health: number
  actions: string[]
}

function generateBossName(): string {
  const bosses = [
    'Traffic Surge', 'DNS Failure', 'Memory Leak',
    'SSL Expiry',    'DDoS Storm',  'Database Crash',
    'CDN Outage',    'API Timeout', 'Server Overload',
  ]
  return bosses[Math.floor(Math.random() * bosses.length)]
}

function generateActions(): string[] {
  const allActions = [
    'Restart service',    'Scale instance',   'Cache purge',
    'Failover to backup', 'Update DNS',        'Roll back deploy',
    'Flush CDN',          'Re-route traffic',  'Patch memory leak',
  ]
  const count = 2 + Math.floor(Math.random() * 2)
  return allActions.sort(() => Math.random() - 0.5).slice(0, count)
}

export function calculateBossBattles(monitorName: string, heartbeats: Heartbeat[]): BossBattle[] {
  const battles: BossBattle[] = []
  const sorted = [...heartbeats].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].status === 'DOWN') {
      const downAt = sorted[i].created_at
      let resolvedAt: string | null = null
      let recoveryMs: number | null = null

      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j].status === 'UP') {
          resolvedAt = sorted[j].created_at
          recoveryMs = new Date(resolvedAt).getTime() - new Date(downAt).getTime()
          i = j
          break
        }
      }

      const defeated = resolvedAt !== null
      const fast = recoveryMs !== null && recoveryMs <= 60_000
      const xpEarned = fast ? XP_FAST_RECOVERY + 25 : defeated ? 15 : 0

      // Simulate remaining health as % of downtime length
      const healthPct = defeated
        ? 0
        : Math.min(100, Math.floor(Math.random() * 60) + 40)

      battles.push({
        id: `battle-${i}`,
        monitorName,
        bossName: generateBossName(),
        startedAt: downAt,
        resolvedAt,
        recoveryMs,
        status: !defeated ? 'Ongoing' : fast ? 'Defeated' : 'Survived',
        xpEarned,
        health: healthPct,
        actions: generateActions(),
      })
    }
  }

  return battles.slice(-5).reverse() // Most recent 5
}

// ─── Aggregate across all monitors ──────────────────────────
export type UserGameProfile = {
  totalXP: number
  level: number
  progressPercent: number
  xpToNextLevel: number
  topRank: Rank
  totalUptimeStreak: number
  achievements: Achievement[]
  earnedCount: number
}

export function aggregateProfile(monitors: MonitorStats[]): UserGameProfile {
  let totalXP = 0
  let topUptimePct = 0
  let totalUptimeStreak = 0
  const allHeartbeats: Heartbeat[] = []

  monitors.forEach(m => {
    const xp = calculateXP(m.heartbeats)
    totalXP += xp.xp
    topUptimePct = Math.max(topUptimePct, m.uptimePercentage ?? 0)
    const streaks = calculateStreaks(m.heartbeats)
    totalUptimeStreak = Math.max(totalUptimeStreak, streaks.uptimeStreak)
    allHeartbeats.push(...m.heartbeats)
  })

  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1
  const xpInLevel = totalXP % XP_PER_LEVEL
  const progressPercent = Math.round((xpInLevel / XP_PER_LEVEL) * 100)
  const xpToNextLevel = XP_PER_LEVEL - xpInLevel
  const topRank = getRank(topUptimePct)

  const allStreaks = calculateStreaks(allHeartbeats)
  const allXP = { xp: totalXP, level, xpInCurrentLevel: xpInLevel, xpToNextLevel, progressPercent }
  const achievements = calculateAchievements(allHeartbeats, allStreaks, allXP, topUptimePct)
  const earnedCount = achievements.filter(a => a.earned).length

  return { totalXP, level, progressPercent, xpToNextLevel, topRank, totalUptimeStreak, achievements, earnedCount }
}
