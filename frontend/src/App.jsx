import { BrowserRouter, Routes, Route, Navigate, useLocation, NavLink } from 'react-router-dom'
import SystemStatusBar from './components/SystemStatusBar'
import SystemLogs from './components/SystemLogs'
import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Scanning from './pages/Scanning'
import Analytics from './pages/Analytics'
import Learn from './pages/Learn'
import History from './pages/History'
import ErrorBoundary from './components/ErrorBoundary'
import API_BASE from './config'

export const ScanContext = createContext({ scanning: false, scanProject: '', setScanning: () => {}, setScanProject: () => {} })
export const useScan = () => useContext(ScanContext)

export default function App() {
  const [scanning, setScanning] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [scanProject, setScanProject] = useState('')
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    document.documentElement.setAttribute('data-theme', savedTheme)
    return savedTheme
  })
  const [healthStatus, setHealthStatus] = useState(null)
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
    const interval = setInterval(fetchHealth, 60000) // Poll every minute
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

  const getSyncBg = (isoString) => {
    if (!isoString) return 'var(--blue-dim)'
    const mins = (Date.now() - new Date(isoString).getTime()) / 60000
    if (mins < 30)  return 'var(--green-dim)'
    if (mins < 120) return 'var(--yellow-dim)'
    return 'var(--red-dim)'
  }
  const getSyncBorder = (isoString) => {
    if (!isoString) return 'var(--border)'
    const mins = (Date.now() - new Date(isoString).getTime()) / 60000
    if (mins < 30)  return 'var(--fix-border)'
    if (mins < 120) return 'rgba(245,158,11,0.4)'
    return 'rgba(239,68,68,0.4)'
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
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}} @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}} @keyframes pulse-node{0%,100%{opacity:0.8}50%{opacity:1}} @keyframes dash{to{stroke-dashoffset:-20}}`}</style>
        <div style={{ minHeight: location.pathname === '/results' ? undefined : '100vh', height: location.pathname === '/results' ? '100dvh' : undefined, overflow: location.pathname === '/results' ? (window.innerWidth > 900 ? 'hidden' : 'auto') : undefined, background: 'var(--bg)' }}>
          {isLanding ? (
            <div style={{ position: 'fixed', top: 19, right: 16, zIndex: 1001 }}>
              <button onClick={toggleTheme} aria-label="Toggle theme" style={{ width: 36, height: 20, borderRadius: 10, border: 'none', background: theme === 'dark' ? 'var(--brand)' : 'var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.3s', padding: 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--white)', position: 'absolute', top: 3, left: theme === 'dark' ? 19 : 3, transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
              </button>
            </div>
          ) : (
            <nav className="nav" style={{ padding: '0 16px', gap: 6 }}>
              <NavLink to="/" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--text)', marginRight: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 26, height: 26, background: 'linear-gradient(135deg, var(--brand), var(--accent2))', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                DepAnalyzer
              </NavLink>
              {[{to:'/scan',label:'Scanner'},{to:'/learn',label:'Knowledge Base'},{to:'/history',label:'History'}].map(({to,label}) => (
                <NavLink key={to} to={to} className="nav-link-btn" style={({isActive}) => ({ padding: '6px 12px', fontSize: 13, fontWeight: 600, borderRadius: 6, background: isActive ? 'var(--brand-dim)' : 'none', color: isActive ? 'var(--brand)' : 'var(--text-muted)', transition: 'all 0.15s', whiteSpace: 'nowrap' })}>
                  {label}
                </NavLink>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* OSV freshness indicator — highest-converting trust signal for a security tool */}
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  style={{ background: 'none', border: 'none', color: showLogs ? 'var(--brand)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 9, fontFamily: 'var(--font-mono)', padding: '2px 6px', letterSpacing: '0.05em' }}>
                  LOGS
                </button>
                {healthStatus && (
                <div title={
                  healthStatus.error
                    ? 'OSV sync status unavailable — backend unreachable'
                    : `Last successful sync from OSV: ${healthStatus?.osv_synced_at || 'Unknown'}`
                } style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                  background: healthStatus.error ? 'var(--red-dim)' : getSyncBg(healthStatus?.osv_synced_at),
                  border: `1px solid ${healthStatus.error ? 'rgba(239,68,68,0.4)' : getSyncBorder(healthStatus?.osv_synced_at)}`,
                  borderRadius: 5, cursor: 'default' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%',
                    background: healthStatus.error ? 'var(--critical)' : getSyncColor(healthStatus?.osv_synced_at),
                    display: 'inline-block' }} />
                  <span style={{ fontSize: 10,
                    color: healthStatus.error ? 'var(--critical)' : getSyncColor(healthStatus?.osv_synced_at),
                    fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    {healthStatus.error
                      ? 'OSV offline'
                      : healthStatus?.osv_synced_at
                        ? `OSV ${getRelativeTime(healthStatus.osv_synced_at)}`
                        : 'OSV syncing'}
                  </span>
                </div>
                )}
                {scanning && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--brand-dim)', border: '1px solid var(--brand)', borderRadius: 6, padding: '4px 10px', color: 'var(--brand)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                    Scanning...
                  </div>
                )}
                <button onClick={toggleTheme} aria-label="Toggle theme" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} style={{ width: 36, height: 20, borderRadius: 10, border: 'none', background: theme === 'dark' ? 'var(--brand)' : 'var(--border-light)', cursor: 'pointer', position: 'relative', transition: 'background 0.3s', padding: 0, flexShrink: 0 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--white)', position: 'absolute', top: 3, left: theme === 'dark' ? 19 : 3, transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </button>
              </div>
            </nav>
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
