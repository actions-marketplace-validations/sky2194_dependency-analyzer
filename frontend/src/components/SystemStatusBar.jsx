import { useEffect, useState } from 'react'
import API_BASE from '../config'

// Track app start time once, module-level
const APP_START = Date.now()

export default function SystemStatusBar({ healthStatus: externalHealth }) {
  const [health, setHealth] = useState(null)
  const [time, setTime]     = useState(new Date())
  const [txnId]             = useState(() => Math.random().toString(36).slice(2, 8).toUpperCase())

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Use external healthStatus if provided, else fetch own
  useEffect(() => {
    if (externalHealth) { setHealth(externalHealth); return }
    const load = async () => {
      try { setHealth(await (await fetch(`${API_BASE}/api/health`)).json()) } catch {}
    }
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [externalHealth])

  const h = health

  // OSV sync status
  const osv = (() => {
    if (!h?.osv_synced_at) return { color: 'var(--critical)', label: 'NEVER' }
    const m = Math.floor((Date.now() - new Date(h.osv_synced_at)) / 60000)
    if (m < 5)  return { color: 'var(--green)',  label: 'SYNCED' }
    if (m < 15) return { color: 'var(--yellow)', label: `${m}m` }
    return               { color: 'var(--critical)', label: `${m}m` }
  })()

  // Real uptime from app start
  const uptimeMins = Math.floor((Date.now() - APP_START) / 60000)

  const timeStr = time.toISOString().slice(0, 19).replace('T', ' ')

  // Reusable dot
  const Dot = ({ color }) => (
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
  )

  // Pipe divider
  const Pipe = () => (
    <span style={{ color: 'var(--border-light)', padding: '0 4px', userSelect: 'none' }}>│</span>
  )

  // Shared row base style
  const base = {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '0 12px',
    height: 22,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    letterSpacing: '0.03em',
    borderBottom: '1px solid var(--border)',
  }

  return (
    <>
      {/* ── Row 1: live status dots + clock ───────────────────────────── */}
      <div style={{ ...base, background: 'var(--bg-panel)', color: 'var(--text-muted)' }}>

        <Dot color="var(--green)" />
        <span style={{ color: 'var(--text-muted)', fontSize: 8, fontWeight: 700 }}>SYS</span>
        <span style={{ color: 'var(--green)' }}>ONLINE</span>

        <Dot color={h?.db_connected ? 'var(--green)' : 'var(--critical)'} />
        <span style={{ color: 'var(--text-muted)', fontSize: 8, fontWeight: 700 }}>DB</span>
        <span style={{ color: h?.db_connected ? 'var(--green)' : 'var(--critical)' }}>
          {h?.db_connected ? 'CONNECTED' : 'DISCONNECTED'}
        </span>

        <Dot color={osv.color} />
        <span style={{ color: 'var(--text-muted)', fontSize: 8, fontWeight: 700 }}>OSV</span>
        <span style={{ color: osv.color }}>{osv.label}</span>

        <Dot color="var(--text-muted)" />
        <span style={{ color: 'var(--text-muted)', fontSize: 8, fontWeight: 700 }}>NVD</span>
        <span>IDLE</span>

        <Pipe />

        <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)' }}>UP</span>
        <span style={{ color: 'var(--green)' }}>{uptimeMins}m</span>

        <Pipe />

        <span>{timeStr} UTC</span>

        <span style={{ marginLeft: 'auto', fontSize: 8 }}>v2.4.1</span>
      </div>

      {/* ── Row 2: SYS_READY operational strip ────────────────────────── */}
      <div style={{ ...base, background: 'var(--bg)', color: 'var(--text-muted)', fontSize: 8 }}>

        <Dot color="var(--green)" />
        <span style={{ color: 'var(--green)', fontWeight: 700 }}>SYS_READY</span>

        <Pipe />
        <span style={{ fontSize: 8, fontWeight: 700 }}>TXN:</span>
        <span style={{ color: 'var(--text)' }}>{txnId}</span>

        <Pipe />
        <span style={{ fontSize: 8, fontWeight: 700 }}>DB:</span>
        <span style={{ color: h?.db_connected ? 'var(--green)' : 'var(--critical)' }}>
          {h?.db_connected ? 'CONNECTED' : 'DISCONNECTED'}
        </span>

        <Pipe />
        <span style={{ fontSize: 8, fontWeight: 700 }}>OSV:</span>
        <span style={{ color: osv.color }}>{osv.label}</span>

        <Pipe />
        <span style={{ fontSize: 8, fontWeight: 700 }}>NVD_POLL:</span>
        <span style={{ color: 'var(--text)' }}>300s</span>

        <span style={{ marginLeft: 'auto' }}>{timeStr} UTC</span>
      </div>
    </>
  )
}
