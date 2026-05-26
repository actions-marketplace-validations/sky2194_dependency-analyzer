import { useRef, useEffect } from 'react'

const LEVEL_COLOR = {
  INFO:  'var(--blue)',
  OK:    'var(--green)',
  WARN:  'var(--high)',
  ERROR: 'var(--critical)',
  DEBUG: 'var(--text-muted)',
}

function buildEntries(healthStatus) {
  if (!healthStatus) {
    return [{ level: 'INFO', message: 'Connecting to backend...' }]
  }
  if (healthStatus.error) {
    return [{ level: 'ERROR', message: 'Backend unreachable — health check failed' }]
  }

  const entries = []

  // System + version
  entries.push({ level: 'OK', message: 'Health check passed — API responding' })
  if (healthStatus.version) {
    entries.push({ level: 'INFO', message: `Version ${healthStatus.version}` })
  }

  // DB / OSV mode — branch cleanly on whether a DB cache is present
  if (healthStatus.db_connected) {
    entries.push({ level: 'OK', message: 'PostgreSQL connected — CVE cache ready' })

    if (healthStatus.osv_synced_at) {
      const mins = Math.floor((Date.now() - new Date(healthStatus.osv_synced_at)) / 60000)
      const age  = mins < 1 ? 'just now' : `${mins}m ago`
      entries.push({ level: mins < 60 ? 'OK' : 'WARN', message: `OSV last synced ${age}` })
    } else {
      entries.push({ level: 'WARN', message: 'OSV not yet synced — initial seed may be pending' })
    }

    if (healthStatus.epss_synced_at) {
      const mins = Math.floor((Date.now() - new Date(healthStatus.epss_synced_at)) / 60000)
      entries.push({ level: mins < 60 ? 'OK' : 'WARN', message: `EPSS scores synced ${mins < 1 ? 'just now' : `${mins}m ago`}` })
    }

    if (healthStatus.kev_synced_at) {
      const mins = Math.floor((Date.now() - new Date(healthStatus.kev_synced_at)) / 60000)
      entries.push({ level: mins < 60 ? 'OK' : 'WARN', message: `CISA KEV list synced ${mins < 1 ? 'just now' : `${mins}m ago`}` })
    }
  } else {
    // Normal operating mode — no local DB, OSV queried live per scan
    entries.push({ level: 'INFO', message: 'Live query mode — OSV queried per scan (no local DB cache)' })
  }

  // NVD key
  if (typeof healthStatus.nvd_api_key_configured === 'boolean') {
    entries.push({
      level: healthStatus.nvd_api_key_configured ? 'OK' : 'WARN',
      message: healthStatus.nvd_api_key_configured
        ? 'NVD API key configured — 50 req/30s rate limit'
        : 'NVD API key not set — limited to 5 req/30s (set NVD_API_KEY for better performance)',
    })
  }

  // Rate limit
  if (healthStatus.rate_limit) {
    entries.push({ level: 'INFO', message: `Scan rate limit: ${healthStatus.rate_limit}` })
  }

  return entries
}

export default function SystemLogs({ healthStatus, maxHeight = 180 }) {
  const containerRef = useRef(null)
  const entries = buildEntries(healthStatus)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [entries.length])

  return (
    <div style={{ background: 'var(--code-bg)', borderBottom: '1px solid var(--border)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '3px 10px',
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)' }}>
          SYSTEM_LOGS
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)' }}>
          ({entries.length} entries)
        </span>
      </div>
      <div ref={containerRef} style={{
        maxHeight,
        overflowY: 'auto',
        padding: '4px 10px',
        fontFamily: 'var(--font-mono)',
        fontSize: 8,
        lineHeight: 1.6,
      }}>
        {entries.map((log, i) => (
          <div key={i} style={{
            display: 'flex', gap: 8,
            padding: '1px 0',
            borderBottom: i < entries.length - 1 ? '1px solid var(--border-light)' : 'none',
          }}>
            <span style={{ color: LEVEL_COLOR[log.level] || 'var(--text-muted)', fontWeight: 700, minWidth: 36, flexShrink: 0 }}>
              {log.level}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
