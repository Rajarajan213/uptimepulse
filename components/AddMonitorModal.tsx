'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Globe, Clock, Tag } from 'lucide-react'

type Props = {
  onClose: () => void
  onAdded: () => void
}

export default function AddMonitorModal({ onClose, onAdded }: Props) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('https://')
  const [interval, setInterval] = useState(60)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate URL
    try { new URL(url) } catch {
      setError('Please enter a valid URL (include https://)')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setLoading(false); return }

    const { error: err } = await supabase.from('monitors').insert({
      user_id: user.id,
      name,
      url,
      interval,
      is_active: true,
    })

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      onAdded()
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      backdropFilter: 'blur(4px)',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: 480, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Add New Monitor</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              <Tag size={12} style={{ marginRight: 6, display: 'inline' }} />Monitor Name
            </label>
            <input
              id="monitor-name"
              type="text"
              className="input"
              placeholder="e.g. My Website API"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              <Globe size={12} style={{ marginRight: 6, display: 'inline' }} />URL to Monitor
            </label>
            <input
              id="monitor-url"
              type="url"
              className="input"
              placeholder="https://example.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              required
            />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>We&apos;ll use HEAD requests to check without downloading the full page</p>
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              <Clock size={12} style={{ marginRight: 6, display: 'inline' }} />Check Interval
            </label>
            <select
              id="monitor-interval"
              className="input"
              value={interval}
              onChange={e => setInterval(Number(e.target.value))}
              style={{ cursor: 'pointer' }}>
              <option value={30}>Every 30 seconds</option>
              <option value={60}>Every 1 minute</option>
              <option value={120}>Every 2 minutes</option>
              <option value={300}>Every 5 minutes</option>
              <option value={600}>Every 10 minutes</option>
            </select>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: 'var(--accent-red)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button id="add-monitor-submit" type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
              {loading ? 'Adding...' : 'Add Monitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
