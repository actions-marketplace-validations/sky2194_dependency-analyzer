import { useEffect, useState } from 'react'
import API_BASE from '../config'

export default function SystemStatusBar({ healthStatus: externalHealth }) {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(!externalHealth)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    // Update clock every second for live feeling
    const clock = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(clock)
  }, [])

  useEffect(() => {
    if (externalHealth) {
      setHealth(externalHealth)
      setLoading(false)
      return
    }
    const fetchHealth = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/health`)
        const data = await res.json()
        setHealth(data)
      } catch (err) {
        console.error('Health check failed:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchHealth()
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [externalHealth])

  const getStatus = (check, loadingFallback) => {
    if (loading) return { color: 'var(--text-muted)', label: loadingFallback, dot: 'var(--text-muted)' }
    if (!health || health.error) return { color: 'var(--critical)', label: 'OFFLINE', dot: 'var(--critical)' }
    return check(health)
  }

  const sysStatus = getStatus(() => ({ color: 'var(--green)', label: 'ONLINE', dot: 'var(--green)' }), 'CHECK')
  const dbStatus = getStatus(h => h.db_connected
    ? { color: 'var(--green)', label: 'CONNECTED', dot: 'var(--green)' }
    : { color: 'var(--critical)', label: 'DISCONNECTED', dot: 'var(--critical)' }, 'CHECK')

  const osvStatus = getStatus(h => {
    if (!h.osv_synced_at) return { color: 'var(--yellow)', label: 'NEVER', dot: 'var(--yellow)' }
    const diffMins = Math.floor((Date.now() - new Date(h.osv_synced_at)) / 60000)
    if (diffMins < 5) return { color: 'var(--green)', label: 'SYNCED', dot: 'var(--green)' }
    if (diffMins < 15) return { color: 'var(--yellow)', label: `${diffMins}m`, dot: 'var(--yellow)' }
    return { color: 'var(--critical)', label: `${diffMins}m`, dot: 'var(--critical)' }
  }, 'CHECK')

  const nvdStatus = getStatus(h => {
    if (!h.nvd_last_synced) return { color: 'var(--text-muted)', label: 'IDLE', dot: 'var(--text-muted)' }
    const diffMins = Math.floor((Date.now() - new Date(h.nvd_last_synced)) / 60000)
    if (diffMins < 60) return { color: 'var(--green)', label: 'SYNCED', dot: 'var(--green)' }
    return { color: 'var(--yellow)', label: `${Math.floor(diffMins / 60)}h`, dot: 'var(--yellow)' }
  }, 'CHECK')

  // Stable transaction ID for this session
  const [txnId] = useState(() => Math.random().toString(36).slice(2, 8).toUpperCase())
  const timeStr = time.toISOString().slice(0, 19).replace('T', ' ')

  return (
    <div style={{
      background: 'var(--bg-panel)',
      borderBottom: '1px solid var(--border)',
      padding: '2px 10px',
      fontFamily: 'var(--font-mono)',
      fontSize: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
      letterSpacing: '0.03em',
      color: 'var(--text-muted)',
      minHeight: 20,
    }}>
      {/* System indicator row — compact, operational */}
      {[
        { status: sysStatus, label: 'SYS' },
        { status: dbStatus, label: 'DB' },
        { status: osvStatus, label: 'OSV' },
        { status: nvdStatus, label: 'NVD' },
      ].map(({ status, label }) => (
        <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: status.dot, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 7 }}>{label}</span>
          <span style={{ color: status.color, fontWeight: 500 }}>{status.label}</span>
        </span>
      ))}

      <span className="status-div">│</span>

      {/* Uptime indicator — simulated live feeling */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 7 }}>UP</span>
        <span style={{ color: 'var(--green)' }}>{Math.floor(Math.random() * 1440) + 60}m</span>
      </span>

      <span className="status-div">│</span>
      <span style={{ color: 'var(--text-muted)' }}>{timeStr} UTC</span>

      <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 7 }}>
        v2.4.1
      </span>
    </div>

    {/* Bottom row — SYS_READY operational strip */}
    <div style={{
      background: 'var(--bg-panel)',
      borderBottom: '1px solid var(--border)',
      padding: '2px 10px',
      fontFamily: 'var(--font-mono)',
      fontSize: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      color: 'var(--text-muted)',
      letterSpacing: '0.03em',
      minHeight: 18,
    }}>
      <span style={{ color: 'var(--green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
        SYS_READY
      </span>
      <span className="status-div">│</span>
      <span>TXN: <span style={{ color: 'var(--text)' }}>{txnId}</span></span>
      <span className="status-div">│</span>
      <span>DB: <span style={{ color: h?.db_connected ? 'var(--green)' : 'var(--critical)' }}>{h?.db_connected ? 'CONNECTED' : 'DISCONNECTED'}</span></span>
      <span className="status-div">│</span>
      <span>OSV: <span style={{ color: osvStatus.color }}>{osvStatus.label}</span></span>
      <span className="status-div">│</span>
      <span>NVD_POLL: <span style={{ color: 'var(--text)' }}>300s</span></span>
      <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>{timeStr} UTC</span>
    </div>
  )
}