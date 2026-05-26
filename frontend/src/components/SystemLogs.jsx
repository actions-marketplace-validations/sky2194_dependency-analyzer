import { useState, useEffect, useRef } from 'react'

const SIMULATED_LOGS = [
  { level: 'INFO', message: 'OSV database sync completed successfully' },
  { level: 'INFO', message: 'NVD mirror check: 0 new CVEs since last poll' },
  { level: 'DEBUG', message: 'Cache warmup complete — 12,847 CVE records indexed' },
  { level: 'OK', message: 'Health check passed: all services responding' },
  { level: 'INFO', message: 'EPSS score batch updated for 2,341 CVEs' },
  { level: 'DEBUG', message: 'Dependency resolver initialized for npm ecosystem' },
  { level: 'INFO', message: 'Circuit breaker status: CLOSED (all services healthy)' },
  { level: 'DEBUG', message: 'Manifest parser cache: 14 entries, 98% hit rate' },
]

export default function SystemLogs({ logs = SIMULATED_LOGS, maxHeight = 180 }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [entries, setEntries] = useState(logs || [])
  const containerRef = useRef(null)

  // Auto-scroll to bottom when new entries appear
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [entries])

  // Simulate live log entries appearing
  useEffect(() => {
    const interval = setInterval(() => {
      const liveEntries = [
        { level: 'DEBUG', message: `Heartbeat check: ${Math.floor(Math.random() * 100)}ms latency` },
        { level: 'INFO', message: 'Dependency graph cache refreshed' },
        { level: 'DEBUG', message: `Rate limit counter reset: ${Math.floor(Math.random() * 50)} requests/min` },
      ]
      const random = liveEntries[Math.floor(Math.random() * liveEntries.length)]
      setEntries(prev => [...prev.slice(-50), { ...random, timestamp: new Date().toISOString().slice(11, 19) }])
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  if (!entries || entries.length === 0) return null

  return (
    <div style={{ background: 'var(--code-bg)', borderBottom: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Header — terminal style */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '3px 10px', cursor: 'pointer',
          background: 'var(--bg-panel)',
          borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
          userSelect: 'none'
        }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)' }}>
          SYSTEM_LOGS
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)' }}>
          ({entries.length} entries)
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)' }}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {/* Log entries — dense terminal output */}
      {isExpanded && (
        <div ref={containerRef} style={{
          maxHeight,
          overflowY: 'auto',
          padding: '4px 10px',
          fontFamily: 'var(--font-mono)',
          fontSize: 8,
          lineHeight: 1.55
        }}>
          {entries.map((log, i) => (
            <div key={i} style={{
              display: 'flex', gap: 6,
              padding: '1px 0',
              borderBottom: i < entries.length - 1 ? '1px solid var(--border-light)' : 'none'
            }}>
              <span style={{ color: 'var(--text-muted)', minWidth: 52, flexShrink: 0, fontSize: 7 }}>
                {log.timestamp || '--:--:--'}
              </span>
              <span style={{
                minWidth: 36, flexShrink: 0, fontWeight: 700,
                color: getSeverityColor(log.level), fontSize: 7, textTransform: 'uppercase'
              }}>
                {log.level || 'INFO'}
              </span>
              <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-word', fontSize: 8 }}>
                {log.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function getSeverityColor(level) {
  const colors = {
    'ERROR': 'var(--critical)',
    'WARN': 'var(--yellow)',
    'WARNING': 'var(--yellow)',
    'INFO': 'var(--blue)',
    'DEBUG': 'var(--text-muted)',
    'SUCCESS': 'var(--green)',
    'OK': 'var(--green)'
  }
  return colors[level?.toUpperCase()] || 'var(--text-muted)'
}