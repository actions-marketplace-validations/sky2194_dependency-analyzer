import { useState } from 'react'

const LEVEL_COLOR = {
  INFO:  'var(--brand)',
  OK:    'var(--green)',
  WARN:  'var(--high)',
  ERROR: 'var(--critical)',
  DEBUG: 'var(--text-muted)',
}

export default function SystemLogs({ healthStatus }) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Build real log entries from healthStatus — no fake data
  const entries = []

  if (!healthStatus) {
    entries.push({ level: 'INFO', message: 'Connecting to backend...' })
  } else if (healthStatus.error) {
    entries.push({ level: 'ERROR', message: 'Backend unreachable — health check failed' })
  } else {
    // DB
    entries.push(healthStatus.db_connected
      ? { level: 'OK',   message: 'PostgreSQL connected — CVE cache ready' }
      : { level: 'ERROR', message: 'PostgreSQL disconnected — falling back to live OSV API' }
    )

    // OSV sync
    if (healthStatus.osv_synced_at) {
      const mins = Math.floor((Date.now() - new Date(healthStatus.osv_synced_at)) / 60000)
      entries.push({ level: 'INFO', message: `OSV last synced ${mins}m ago — ${mins < 10 ? 'fresh' : mins < 60 ? 'recent' : 'stale'}` })
    } else {
      entries.push({ level: 'WARN', message: 'OSV sync timestamp unavailable — seed may be pending' })
    }

    // EPSS
    if (healthStatus.epss_synced_at) {
      entries.push({ level: 'INFO', message: 'EPSS scores loaded — exploit probability data available' })
    }

    // KEV
    if (healthStatus.kev_synced_at) {
      entries.push({ level: 'INFO', message: 'CISA KEV list loaded — known exploited vulnerabilities indexed' })
    }

    // NVD
    entries.push({ level: healthStatus.nvd_api_key_configured ? 'OK' : 'WARN',
      message: healthStatus.nvd_api_key_configured
        ? 'NVD API key configured — 50 req/30s rate limit'
        : 'NVD API key not set — limited to 5 req/30s (set NVD_API_KEY for better performance)'
    })

    // Rate limit
    if (healthStatus.rate_limit) {
      entries.push({ level: 'INFO', message: `Rate limit: ${healthStatus.rate_limit}` })
    }

    // Status
    entries.push({ level: 'OK', message: `System ready — version ${healthStatus.version || '1.0.0'}` })
  }

  return (
    <div style={{ background: 'var(--code-bg)', borderBottom: '1px solid var(--border)' }}>
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '3px 10px', cursor: 'pointer',
          background: 'var(--bg-panel)',
          borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
          userSelect: 'none'
        }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--brand)' }}>
          SYSTEM_LOGS
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)' }}>
          ({entries.length} entries)
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)' }}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {/* Log entries */}
      {isExpanded && (
        <div style={{
          maxHeight: 160,
          overflowY: 'auto',
          padding: '4px 10px',
          fontFamily: 'var(--font-mono)',
          fontSize: 8,
          lineHeight: 1.6
        }}>
          {entries.map((log, i) => (
            <div key={i} style={{
              display: 'flex', gap: 8,
              padding: '1px 0',
              borderBottom: i < entries.length - 1 ? '1px solid var(--border-light)' : 'none'
            }}>
              <span style={{ color: LEVEL_COLOR[log.level] || 'var(--text-muted)', fontWeight: 700, minWidth: 36 }}>
                {log.level}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
