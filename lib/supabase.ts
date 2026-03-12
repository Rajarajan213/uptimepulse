import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton — never instantiated at build time
let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Missing Supabase env vars')
    _client = createClient(url, key)
  }
  return _client
}

// Named export so existing 'supabase.xxx' calls still work in client components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getSupabase() as any)[prop]
  },
})

// Server-side admin client (bypasses RLS) — always call as a function
export function supabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ─── Types ────────────────────────────────────────────────

export type Monitor = {
  id: string
  user_id: string
  name: string
  url: string
  interval: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Heartbeat = {
  id: string
  monitor_id: string
  status: 'UP' | 'DOWN'
  response_time: number | null
  status_code: number | null
  error: string | null
  created_at: string
}

export type Incident = {
  id: string
  monitor_id: string
  started_at: string
  resolved_at: string | null
  type: string
  error: string | null
}
