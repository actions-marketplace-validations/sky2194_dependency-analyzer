import { useEffect, useState, useCallback } from 'react'
import API_BASE from '../config'

export default function SystemStatusBar({ healthStatus: externalHealth }) {
  const [health, setHealth]   = useState(null)
  const [time, setTime]       = useState(new Date())
  const [txnId]               = useState(() => Math.random().toString(36).slice(2, 8).toUpperCase())

  useEffect(() => {
    const clock = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(clock)
  }, [])

  useEffect(() => {
    if (externalHealth) { setHealth(externalHealth); return }
    const fetch_ = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/health`)
        setHealth(await r.json())
      } catch {}
    }
    fetch_()
    const t = setInterval(fetch_, 30000)
    return () => clearInterval(t)
  }, [externalHealth])

  const h = health

  const getOsvStatus = () => {
    if (!h?.osv_synced_at) return { color: 'var(--critical)', label: 'NEVER' }
    const mins = Math.floor((Date.now() - new Date(h.osv_synced_at)) / 60000)
    if (mins < 5)  return { color: 'var(--green)',    label: 'SYNCED' }
    if (mins < 15) return { color: 'var(--yellow)',   label: `${mins}m` }
    return             { color: 'var(--critical)',  label: `${mins}m` }
  }

  const osv = getOsvStatus()
  const timeStr = time.toISOString().slice(0, 19).replace('T', ' ')

  const dot = (color) => (
    <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
  )

  const div = <span style={{ color: 'var(--border-light)', userSelect: 'none', padding: '0 2px' }}>│</span>

  const rowStyle = {
    background: 'var(--bg-panel)',
    borderBottom: '1px solid var(--border)',
    padding: '0 12px',
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: 'var(--text-muted)',
    letterSpacing: '0.04em',
    height: 20,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  }

  const label = (text) => (
    <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)' }}>{text}</span>
  )

  return (
    <>
      {/* ── Row 1: live status dots ── */}
      <div style={rowStyle}>
        {dot('var(--green)')} {label('SYS')} <span style={{ color: 'var(--green)' }}>ONLINE</span>
        {div}
        {dot(h?.db_connected ? 'var(--green)' : 'var(--critical)')} {label('DB')}
        <span style={{ color: h?.db_connected ? 'var(--green)' : 'var(--critical)' }}>
          {h?.db_connected ? 'CONNECTED' : 'DISCONNECTED'}
        </span>
        {div}
        {dot(osv.color)} {label('OSV')} <span style={{ color: osv.color }}>{osv.label}</span>
        {div}
        {dot('var(--text-muted)')} {label('NVD')} <span>IDLE</span>
        {div}
        {label('UP')} <span style={{ color: 'var(--green)' }}>
          {h ? `${Math.floor((Date.now() - new Date(h.epss_synced_at || Date.now() - 3600000)) / 60000)}m` : '--'}
        </span>
        {div}
        <span>{timeStr} UTC</span>
        <span style={{ marginLeft: 'auto', fontSize: 8 }}>v2.4.1</span>
      </div>

      {/* ── Row 2: SYS_READY operational strip ── */}
      <div style={{ ...rowStyle, background: 'var(--bg)', fontSize: 8 }}>
        {dot('var(--green)')}
        <span style={{ color: 'var(--green)', fontWeight: 700 }}>SYS_READY</span>
        {div}
        <span>{label('TXN:')} <span style={{ color: 'var(--text)' }}>{txnId}</span></span>
        {div}
        <span>{label('DB:')} <span style={{ color: h?.db_connected ? 'var(--green)' : 'var(--critical)' }}>
          {h?.db_connected ? 'CONNECTED' : 'DISCONNECTED'}
        </span></span>
        {div}
        <span>{label('OSV:')} <span style={{ color: osv.color }}>{osv.label}</span></span>
        {div}
        <span>{label('NVD_POLL:')} <span style={{ color: 'var(--text)' }}>300s</span></span>
        <span style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--text-muted)' }}>{timeStr} UTC</span>
      </div>
    </>
  )
}
