import { BrowserRouter, Routes, Route, Navigate, useLocation, NavLink } from 'react-router-dom'
import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Scanning from './pages/Scanning'
import Analytics from './pages/Analytics'
import Learn from './pages/Learn'
import History from './pages/History'
import ErrorBoundary from './components/ErrorBoundary'
import SystemStatusBar, { SystemStatusFooter } from './components/SystemStatusBar'
import SystemLogs from './components/SystemLogs'
import API_BASE from './config'

export const ScanContext = createContext({ scanning: false, scanProject: '', setScanning: () => {}, setScanProject: () => {} })
export const useScan = () => useContext(ScanContext)

export default function App() {
  const [scanning, setScanning] = useState(false)
  const [scanProject, setScanProject] = useState('')
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    document.documentElement.setAttribute('data-theme', savedTheme)
    return savedTheme
  })
  const [healthStatus, setHealthStatus] = useState(null)
  const [showLogs, setShowLogs] = useState(false)
  const location = useLocation()
  const isLanding = location.pathname === '/'

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next); localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme) }, [theme])

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/health`)
        setHealthStatus(res.data)
      } catch (err) {
        console.error('Health check failed:', err)
        setHealthStatus({ error: true })
      }
    }
    fetchHealth()
    const interval = setInterval(fetchHealth, 60000)
    return () => clearInterval(interval)
  }, [])

  const getRelativeTime = (isoString) => {
    if (!isoString) return 'Unknown'
    const now = new Date()
    const then = new Date(isoString)
    const diffMs = now - then
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const getSyncColor = (isoString) => {
    if (!isoString) return 'var(--text-muted)'
    const now = new Date()
    const then = new Date(isoString)
    const diffMs = now - then
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 30) return 'var(--green)'
    if (diffMins < 120) return 'var(--yellow)'
    return 'var(--red)'
  }

  return (
    <ScanContext.Provider value={{ scanning, setScanning, scanProject, setScanProject }}>
      <ErrorBoundary>
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
          {!isLanding && (
            <>
              {/* ══ Nav — compressed operational bar ══ */}
              <nav className="nav" style={{ height: 38 }}>
                <NavLink to="/" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: 'var(--text)', marginRight: 12, display: 'flex', alignItems: 'center', gap: 5, letterSpacing: '0.03em' }}>
                  <div style={{ width: 20, height: 20, background: 'linear-gradient(135deg, var(--brand), var(--accent2))', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  DepAnalyzer
                </NavLink>
                {[
                  { to: '/scan', label: 'SCANNER' },
                  { to: '/learn', label: 'KB' },
                  { to: '/history', label: 'HISTORY' },
                ].map(({ to, label }) => (
                  <NavLink key={to} to={to} style={({ isActive }) => ({
                    padding: '3px 8px', fontSize: 10, fontWeight: 600, borderRadius: 2,
                    background: isActive ? 'var(--brand-dim)' : 'none',
                    color: isActive ? 'var(--brand)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', transition: 'all 0.12s'
                  })}>{label}</NavLink>
                ))}

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* OSV freshness indicator */}
                  <div title={`Last sync: ${healthStatus?.osv_synced_at || 'Unknown'}`} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '1px 6px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 2, cursor: 'default' }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: getSyncColor(healthStatus?.osv_synced_at), display: 'inline-block' }} />
                    <span style={{ fontSize: 8, color: getSyncColor(healthStatus?.osv_synced_at), fontFamily: 'var(--font-mono)' }}>
                      OSV {healthStatus?.osv_synced_at ? getRelativeTime(healthStatus.osv_synced_at) : '--'}
                    </span>
                  </div>

                  {/* Scanning indicator */}
                  {scanning && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--brand-dim)', border: '1px solid var(--brand)', borderRadius: 2, padding: '2px 6px', color: 'var(--brand)', fontSize: 8, fontFamily: 'var(--font-mono)' }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--brand)', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                      SCANNING
                    </div>
                  )}

                  {/* Toggle logs */}
                  <button onClick={() => setShowLogs(!showLogs)} style={{ background: 'none', border: 'none', color: showLogs ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 9, fontFamily: 'var(--font-mono)', padding: '2px 5px' }}>
                    LOGS
                  </button>

                  {/* Theme toggle */}
                  <button onClick={toggleTheme} aria-label="Toggle theme" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    style={{ width: 30, height: 16, borderRadius: 8, border: 'none', background: theme === 'dark' ? 'var(--brand)' : 'var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.3s', padding: 0, flexShrink: 0 }}>
                    <div style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--white)', position: 'absolute', top: 2.5, left: theme === 'dark' ? 16 : 2, transition: 'left 0.3s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>
              </nav>

              {/* System Status Bar — live operational strip */}
              <SystemStatusBar healthStatus={healthStatus} />

              {/* Terminal Logs panel — toggleable */}
              {showLogs && (
                <div style={{ borderBottom: '1px solid var(--border)', maxHeight: 200, overflow: 'hidden' }}>
                  <SystemLogs />
                </div>
              )}

              <SystemStatusFooter healthStatus={healthStatus} />
            </>
          )}

          {/* Landing page theme toggle (outside nav) */}
          {isLanding && (
            <div style={{ position: 'fixed', top: 14, right: 14, zIndex: 1001 }}>
              <button onClick={toggleTheme} aria-label="Toggle theme"
                style={{ width: 32, height: 18, borderRadius: 9, border: 'none', background: theme === 'dark' ? 'var(--brand)' : 'var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.3s', padding: 0 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--white)', position: 'absolute', top: 3, left: theme === 'dark' ? 17 : 3, transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
              </button>
            </div>
          )}

          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/scan" element={<Dashboard />} />
            <Route path="/scanning" element={<Scanning />} />
            <Route path="/results" element={<Analytics />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </div>
      </ErrorBoundary>
    </ScanContext.Provider>
  )
}