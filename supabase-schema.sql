-- ============================================================
-- UptimePulse Database Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- 1. MONITORS TABLE
CREATE TABLE IF NOT EXISTS monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  interval INTEGER DEFAULT 60 CHECK (interval >= 30),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HEARTBEATS TABLE
CREATE TABLE IF NOT EXISTS heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID REFERENCES monitors(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('UP', 'DOWN')) NOT NULL,
  response_time INTEGER, -- milliseconds
  status_code INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INCIDENTS TABLE
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID REFERENCES monitors(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  type TEXT DEFAULT 'DOWN',
  error TEXT
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Monitors: users can only see/edit their own
DROP POLICY IF EXISTS "Users manage own monitors" ON monitors;
CREATE POLICY "Users manage own monitors" ON monitors
  FOR ALL USING (auth.uid() = user_id);

-- Heartbeats: users can see heartbeats for their monitors
DROP POLICY IF EXISTS "Users view own heartbeats" ON heartbeats;
CREATE POLICY "Users view own heartbeats" ON heartbeats
  FOR ALL USING (
    monitor_id IN (SELECT id FROM monitors WHERE user_id = auth.uid())
  );

-- Incidents: users can see incidents for their monitors
DROP POLICY IF EXISTS "Users view own incidents" ON incidents;
CREATE POLICY "Users view own incidents" ON incidents
  FOR ALL USING (
    monitor_id IN (SELECT id FROM monitors WHERE user_id = auth.uid())
  );

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_heartbeats_monitor_id ON heartbeats(monitor_id);
CREATE INDEX IF NOT EXISTS idx_heartbeats_created_at ON heartbeats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_heartbeats_monitor_created ON heartbeats(monitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitors_user_id ON monitors(user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_monitor_id ON incidents(monitor_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Calculate uptime percentage for a monitor over last 24h
CREATE OR REPLACE FUNCTION get_uptime_percentage(p_monitor_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_count INTEGER;
  up_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM heartbeats
  WHERE monitor_id = p_monitor_id
    AND created_at >= NOW() - INTERVAL '24 hours';

  SELECT COUNT(*) INTO up_count
  FROM heartbeats
  WHERE monitor_id = p_monitor_id
    AND created_at >= NOW() - INTERVAL '24 hours'
    AND status = 'UP';

  IF total_count = 0 THEN
    RETURN 100.0;
  END IF;

  RETURN ROUND((up_count::NUMERIC / total_count::NUMERIC) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at on monitors
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_monitors_updated_at ON monitors;
CREATE TRIGGER update_monitors_updated_at
  BEFORE UPDATE ON monitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Service role bypass for cron (needed for API routes)
DROP POLICY IF EXISTS "Service role bypass monitors" ON monitors;
CREATE POLICY "Service role bypass monitors" ON monitors
  FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role bypass heartbeats" ON heartbeats;
CREATE POLICY "Service role bypass heartbeats" ON heartbeats
  FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role bypass incidents" ON incidents;
CREATE POLICY "Service role bypass incidents" ON incidents
  FOR ALL TO service_role USING (true);
