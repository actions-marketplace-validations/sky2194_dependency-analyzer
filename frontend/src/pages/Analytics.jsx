import { useLocation, useNavigate } from 'react-router-dom'
import { useReducer, useState, useEffect } from 'react'
import API_BASE from '../config'
import DependencyGraph from '../components/DependencyGraph'

const SEV_COLOR = { CRITICAL: 'var(--red)', HIGH: 'var(--yellow)', MEDIUM: 'var(--blue)', LOW: 'var(--green)' }
const SEV_DIM = { CRITICAL: 'var(--red-dim)', HIGH: 'var(--yellow-dim)', MEDIUM: 'var(--blue-dim)', LOW: 'var(--green-dim)' }

const pkgName = v => v?.package_name || v?.package || ''
const pkgVersion = v => v?.installed_version || v?.version || ''
const fixText = v => v?.fix_version ? `Upgrade to v${v.fix_version}` : (v?.fix || 'No fix available')
const installCmd = (v, ecosystem = 'npm') => {
  if (!v?.fix_version) return ''
  if (ecosystem === 'pypi') return `pip install ${pkgName(v)}==${v.fix_version}`
  if (ecosystem === 'maven') return `${pkgName(v)} -> ${v.fix_version}`
  return `npm install ${pkgName(v)}@${v.fix_version}`
}

// State management with useReducer
const initialState = {
  // UI state
  tab: 'vulns',
  sevFilter: 'ALL',
  selected: null,
  vulnExpanded: false,
  viewMode: 'grouped',
  showDirectOnly: false,
  expandedPackages: new Set(),
  showAllPackages: false,
  showTooltip: false,
  // Data state
  deepScanResult: null,
  deepScanLoading: false,
  selectedPackage: null
}

function analyticsReducer(state, action) {
  switch (action.type) {
    case 'RESET_ALL':
      return initialState
    case 'SET_TAB':
      return { ...state, tab: action.payload }
    case 'SET_SEV_FILTER':
      return { ...state, sevFilter: action.payload }
    case 'SET_SELECTED':
      return { ...state, selected: action.payload }
    case 'TOGGLE_VULN_EXPANDED':
      return { ...state, vulnExpanded: !state.vulnExpanded }
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload }
    case 'TOGGLE_SHOW_DIRECT_ONLY':
      return { ...state, showDirectOnly: !state.showDirectOnly }
    case 'TOGGLE_PACKAGE_EXPAND':
      const newSet = new Set(state.expandedPackages)
      if (newSet.has(action.payload)) {
        newSet.delete(action.payload)
      } else {
        newSet.add(action.payload)
      }
      return { ...state, expandedPackages: newSet }
    case 'TOGGLE_SHOW_ALL_PACKAGES':
      return { ...state, showAllPackages: !state.showAllPackages }
    case 'SET_SHOW_TOOLTIP':
      return { ...state, showTooltip: action.payload }
    case 'SET_DEEP_SCAN_RESULT':
      return { ...state, deepScanResult: action.payload }
    case 'SET_DEEP_SCAN_LOADING':
      return { ...state, deepScanLoading: action.payload }
    case 'SET_SELECTED_PACKAGE':
      return { ...state, selectedPackage: action.payload }
    default:
      return state
  }
}

export default function Analytics() {
  const { state: locationState } = useLocation()
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(analyticsReducer, initialState)

  const result = locationState?.result

  // STRICT: Validate transaction_id for session isolation - discard if mismatch
  if (result?.transaction_id) {
    const [activeTransactionId] = useState(() => result.transaction_id)
    if (result.transaction_id !== activeTransactionId) {
      console.error('Transaction ID mismatch - discarding stale results')
      return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Transaction expired. Please scan again.</div>
    }
  }
  
  // STRICT: Only accept COMPLETED transactions
  if (result?.status !== 'COMPLETED') {
    console.error('Transaction not completed - discarding results')
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Transaction incomplete. Please scan again.</div>
  }

  // STRICT: Clear ALL state on new transaction - reset reducer to initial state
  useEffect(() => {
    if (result?.transaction_id) {
      dispatch({ type: 'RESET_ALL' })
    }
  }, [result?.transaction_id])
  
  // STRICT: Use ONLY backend data - no fallbacks, no calculations
  const vulns = result?.vulnerabilities || []
  const riskScore = result?.risk_score || 0
  const resolvedPackages = result?.resolved_packages || 0
  const inputPackages = result?.input_packages || 0
  const directDeps = result?.direct_dependencies || 0
  const transitiveDeps = result?.transitive_dependencies || 0
  const tree = result?.dependency_tree || result?.graph
  const explanation = result?.explanation || ''

  // STRICT: No derivations allowed - use backend data only
  const filtered = state.sevFilter === 'ALL' ? vulns : vulns.filter(v => v.severity === state.sevFilter)
  const directOnlyFiltered = state.showDirectOnly ? filtered.filter(v => v.is_direct) : filtered
  const selectedVuln = vulns.find(v => v.cve_id === state.selected)
  
  // STRICT: Use backend-provided counts only - NO array.length usage
  const directPkgs = result?.direct_dependencies || 0
  const transitivePkgs = result?.transitive_dependencies || 0
  const packagesWithVulns = result?.grouped_vulnerability_count || 0
  const securePackages = resolvedPackages - packagesWithVulns

  // STRICT: Use backend-provided counts only - NO array.length usage
  const counts = {
    CRITICAL: result?.grouped_vulnerability_count || 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0
  }

  // STRICT: Simple deduplication for display only
  const dedupedFixes = []
  vulns.filter(v=>v.fix_version).forEach(v => {
    const pkg = pkgName(v)
    const existing = dedupedFixes.find(d => pkgName(d) === pkg)
    const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
    if (!existing || severityOrder[v.severity] > severityOrder[existing.severity]) {
      dedupedFixes.push(v)
    }
  })

  // STRICT: Simple grouping for display only
  const groupedByPackage = {}
  directOnlyFiltered.forEach(v => {
    const pkg = pkgName(v)
    if (!groupedByPackage[pkg]) {
      groupedByPackage[pkg] = {
        package: pkg,
        version: pkgVersion(v),
        vulnerabilities: [],
        highestSeverity: 'LOW',
        severityOrder: { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
      }
    }
    groupedByPackage[pkg].vulnerabilities.push(v)
    if (groupedByPackage[pkg].severityOrder[v.severity] < groupedByPackage[pkg].severityOrder[groupedByPackage[pkg].highestSeverity]) {
      groupedByPackage[pkg].highestSeverity = v.severity
    }
  })
  const groupedPackages = Object.values(groupedByPackage).sort((a, b) => a.severityOrder[a.highestSeverity] - a.severityOrder[b.highestSeverity])

  const [showExportMenu, setShowExportMenu] = useState(false)

  const exportReport = async (type) => {
    try {
      const res = await fetch(`${API_BASE}/api/export/${type}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(result) })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `sca-report.${type==='pdf'?'html':type}`; a.click()
      URL.revokeObjectURL(url)
      setShowExportMenu(false)
    } catch {}
  }

  const handleDeepScan = async (packageName, version, ecosystem) => {
    dispatch({ type: 'SET_SELECTED_PACKAGE', payload: packageName })
    dispatch({ type: 'SET_DEEP_SCAN_LOADING', payload: true })
    try {
      const res = await fetch(`${API_BASE}/api/scan-package`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package: packageName, version, ecosystem: ecosystem || 'pypi' })
      })
      const data = await res.json()
      if (res.ok) {
        dispatch({ type: 'SET_DEEP_SCAN_RESULT', payload: data })
      }
    } catch (err) {
      console.error('Deep scan failed:', err)
    } finally {
      dispatch({ type: 'SET_DEEP_SCAN_LOADING', payload: false })
    }
  }

  const togglePackageExpand = (packageName) => {
    dispatch({ type: 'TOGGLE_PACKAGE_EXPAND', payload: packageName })
  }

  return (
    <div className="analytics-layout">
      {/* MAIN */}
      <div style={{ padding: '24px 28px', overflowX: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: -0.4, marginBottom: 4 }}>
              Security Risk Overview
              {result.is_mock ? (
                <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 4, background: 'var(--yellow-dim)', border: '1px solid var(--warn-border)', color: 'var(--yellow)', verticalAlign: 'middle' }} title="Backend unreachable — showing example data">⚠ DEMO DATA</span>
              ) : (
                <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 4, background: 'var(--green-dim)', border: '1px solid var(--fix-border)', color: 'var(--green)', verticalAlign: 'middle' }} title="Live data from backend">● LIVE</span>
              )}
            </h1>
            <div style={{ fontSize: 12, color: 'var(--red)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <strong>{vulns.length} vulnerabilities detected</strong> across {resolvedPackages} packages ({directDeps} direct + {transitiveDeps} transitive) — {counts.CRITICAL > 0 ? <span>{counts.CRITICAL} critical requires immediate attention</span> : 'no critical issues'}
              <span 
                style={{ fontSize: 14, color: 'var(--text-muted)', cursor: 'help', position: 'relative' }}
                onMouseEnter={() => dispatch({ type: 'SET_SHOW_TOOLTIP', payload: true })}
                onMouseLeave={() => dispatch({ type: 'SET_SHOW_TOOLTIP', payload: false })}
              >
                ?
                {state.showTooltip && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: 0, 
                    background: 'var(--bg-card)', 
                    border: '1px solid var(--border)', 
                    borderRadius: 'var(--radius)', 
                    padding: 8, 
                    fontSize: 10, 
                    color: 'var(--text-secondary)', 
                    width: 200, 
                    zIndex: 10,
                    marginTop: 4,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    Only packages with vulnerabilities are shown here. Use the 'All Packages' tab to see all scanned packages.
                  </div>
                )}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Scan includes direct dependencies and their transitive dependencies. Use "Direct Only" filter to focus on direct packages only.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => navigate('/scan')} style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>✕ Compare Scans</button>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowExportMenu(!showExportMenu)} style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>↓ Export</button>
              {showExportMenu && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, minWidth: 150 }}>
                  <div onClick={() => exportReport('pdf')} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--text)', ':hover': { background: 'var(--bg)' } }}>PDF Report</div>
                  <div onClick={() => exportReport('csv')} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--text)', ':hover': { background: 'var(--bg)' } }}>CSV Data</div>
                  <div onClick={() => exportReport('json')} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--text)', ':hover': { background: 'var(--bg)' } }}>JSON Data</div>
                </div>
              )}
            </div>
            <button onClick={() => navigate('/scan')} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 6, background: 'var(--orange)', color: 'var(--white)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>🔄 New Scan</button>
          </div>
        </div>

        {/* Package Status Summary */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)' }}>Package Status Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>{totalPkgs}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Packages</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{directPkgs} direct + {transitivePkgs} transitive</div>
            </div>
            <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>{packagesWithVulns.size}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Have Vulnerabilities</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Shown in vulnerability list</div>
            </div>
            <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>{securePackages}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Secure</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>No vulnerabilities found</div>
            </div>
          </div>
          <div style={{ marginTop: 12, padding: 8, background: 'var(--yellow-dim)', borderRadius: 'var(--radius)', fontSize: 10, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12 }}>ℹ️</span>
            <span>{explanation}</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1px 1fr auto auto auto auto', gap: 16, alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 22px', marginBottom: 16 }}>
          {/* Risk score ring */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: `conic-gradient(var(--red) 0% ${riskScore}%, var(--border) ${riskScore}% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', background: 'var(--bg-card)' }} />
              <span style={{ position: 'relative', zIndex: 1, fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--red)' }}>{riskScore}</span>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: 'var(--red)', letterSpacing: -1 }}>{riskScore}<span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/100</span></div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', background: 'var(--red-dim)', padding: '2px 8px', borderRadius: 3, fontFamily: 'var(--font-mono)', display: 'inline-block' }}>High Risk</div>
            </div>
          </div>
          <div style={{ width: 1, background: 'var(--border)', height: 48 }} />
          {/* Fix impact */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>FIX IMPACT</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>Fixing {Math.min(counts.CRITICAL+counts.HIGH, 3)} packages reduces 80% of risk</div>
            <div style={{ marginTop: 6, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', maxWidth: 200 }}>
              <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, var(--red) 0%, var(--green) 100%)', borderRadius: 2 }} />
            </div>
          </div>
          {/* Stat pills */}
          {[{v:totalPkgs,l:'Packages',c:'var(--text)',icon:'🔍'},{v:vulns.length,l:'Vulnerabilities',c:'var(--yellow)',icon:'⚠️'},{v:counts.CRITICAL,l:'Critical',c:'var(--red)',icon:'🔴'},{v:counts.HIGH,l:'High',c:'var(--yellow)',icon:'🟡'}].map(({v,l,c,icon}) => (
            <div key={l} style={{ textAlign: 'center', padding: '0 8px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>{icon}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: c }}>{v}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Priority fixes banner */}
        {vulns.filter(v=>v.severity==='CRITICAL'||v.severity==='HIGH').length > 0 && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', animation: 'pulse 2s infinite' }} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Priority Fixes — Resolve these first</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: 4 }}>→ Auto-prioritized by CVSS + exposure</span>
            </div>
            {vulns.filter(v=>v.severity==='CRITICAL'||v.severity==='HIGH').slice(0,3).map(v => (
              <div key={v.cve_id} onClick={() => dispatch({ type: 'SET_SELECTED', payload: v.cve_id })} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderTop: '1px solid var(--border)', cursor: 'pointer' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>{pkgName(v)}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>v{pkgVersion(v)}</span>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{v.description?.slice(0,80)}...</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 4, background: SEV_DIM[v.severity], border: `1px solid ${SEV_COLOR[v.severity]}44`, color: SEV_COLOR[v.severity] }}>{v.severity}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: SEV_COLOR[v.severity] }}>CVSS {v.cvss_score}</span>
                {(v.fix_version || v.fix) && <span style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>✓ {fixText(v)}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 16, overflowX: 'auto' }}>
          {[
            { id: 'vulns', label: 'Vulnerabilities', count: vulns.length },
            { id: 'all-pkgs', label: 'All Packages', count: totalPkgs },
            { id: 'tree', label: 'Dependency Graph', count: null },
            { id: 'fixes', label: 'Fix Suggestions', count: dedupedFixes.length }
          ].map(({ id, label, count }) => (
            <button key={id} onClick={() => dispatch({ type: 'SET_TAB', payload: id })} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: state.tab===id ? 'var(--text)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: `2px solid ${state.tab===id ? 'var(--orange)' : 'transparent'}`, marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
              {label}
              {count !== null && <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 8, background: 'var(--red-dim)', color: 'var(--red)' }}>{count}</span>}
            </button>
          ))}
        </div>

        {/* Tab: All Packages */}
        {state.tab === 'all-pkgs' && (
          <div>
            <div style={{ marginBottom: 12, fontSize: 11, color: 'var(--text-muted)' }}>
              Showing all {resolvedPackages} packages scanned ({directDeps} direct + {transitiveDeps} transitive)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {groupedByPackage.map((group, idx) => {
                const hasVulns = group.vulnerabilities.length > 0
                const borderColor = hasVulns ? SEV_COLOR[group.highestSeverity] : 'var(--green)'
                const bgColor = hasVulns ? SEV_DIM[group.highestSeverity] : 'var(--green-dim)'
                const textColor = hasVulns ? SEV_COLOR[group.highestSeverity] : 'var(--green)'
                return (
                  <div key={idx} style={{ background: 'var(--bg-card)', border: `1px solid ${borderColor}44`, borderRadius: 'var(--radius)', padding: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: bgColor, color: textColor, fontFamily: 'var(--font-mono)' }}>
                      {hasVulns ? group.vulnerabilities.length + ' CVEs' : '✓ Secure'}
                    </span>
                    <span onClick={(e) => { e.stopPropagation(); handleDeepScan(group.package, group.version, result.ecosystem) }} style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--blue)', cursor: 'pointer', textDecoration: 'underline' }}>{group.package}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>v{group.version}</span>
                    <span style={{ flex: 1 }} />
                    {hasVulns && <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 4, background: SEV_DIM[group.highestSeverity], border: `1px solid ${SEV_COLOR[group.highestSeverity]}44`, color: SEV_COLOR[group.highestSeverity] }}>{group.highestSeverity}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tab: Vulnerabilities */}
        {state.tab === 'vulns' && (
          <div>
            {/* Deep scan result modal */}
            {state.deepScanResult && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', maxWidth: 800, maxHeight: '80vh', overflow: 'auto', padding: 24, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Deep Scan: {state.selectedPackage}</h3>
                    <button onClick={() => dispatch({ type: 'SET_DEEP_SCAN_RESULT', payload: null })} style={{ padding: '4px 12px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer' }}>✕</button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                    {state.deepScanResult.total_packages} packages scanned • {state.deepScanResult.vulnerabilities.length} vulnerabilities found
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {state.deepScanResult.vulnerabilities.slice(0, 10).map(v => (
                      <div key={v.cve_id} style={{ background: 'var(--bg)', border: `1px solid var(--border)`, borderLeft: `3px solid ${SEV_COLOR[v.severity]}`, borderRadius: 'var(--radius)', padding: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>{v.package}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--blue)' }}>{v.cve_id}</span>
                          <span style={{ flex: 1 }} />
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: v.is_direct ? 'var(--green-dim)' : 'var(--yellow-dim)', border: `1px solid ${v.is_direct ? 'var(--green)' : 'var(--yellow)'}`, color: v.is_direct ? 'var(--green)' : 'var(--yellow)' }}>{v.is_direct ? 'DIRECT' : 'TRANSITIVE'}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 4, background: SEV_DIM[v.severity], border: `1px solid ${SEV_COLOR[v.severity]}44`, color: SEV_COLOR[v.severity] }}>{v.severity}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{v.description}</div>
                      </div>
                    ))}
                    {state.deepScanResult.vulnerabilities.length > 10 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>
                        ...and {state.deepScanResult.vulnerabilities.length - 10} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Deep scan loading indicator */}
            {state.deepScanLoading && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 24, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Deep scanning {state.selectedPackage}...</div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {['ALL','CRITICAL','HIGH','MEDIUM','LOW'].map(s => (
                <button key={s} onClick={() => dispatch({ type: 'SET_SEV_FILTER', payload: s })} style={{ padding: '4px 10px', borderRadius: 14, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', background: state.sevFilter===s ? 'var(--orange-dim)' : 'var(--bg-card)', color: state.sevFilter===s ? 'var(--orange)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', transition: 'all 0.15s' }}>
                  {s}{s!=='ALL' && ` (${counts[s]||0})`}
                </button>
              ))}
              <button onClick={() => dispatch({ type: 'TOGGLE_SHOW_DIRECT_ONLY' })} style={{ padding: '4px 10px', borderRadius: 14, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', background: state.showDirectOnly ? 'var(--orange-dim)' : 'var(--bg-card)', color: state.showDirectOnly ? 'var(--orange)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', transition: 'all 0.15s' }}>
                {state.showDirectOnly ? '✓ Direct Only' : '○ Direct Only'}
              </button>
              <button onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: state.viewMode === 'list' ? 'grouped' : 'list' })} style={{ padding: '4px 10px', borderRadius: 14, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', transition: 'all 0.15s' }}>
                {state.viewMode === 'list' ? '📋 Group by Package' : '📄 List View'}
              </button>
              {directOnlyFiltered.length > 5 && (
                <button onClick={() => dispatch({ type: 'TOGGLE_VULN_EXPANDED' })} style={{ padding: '4px 10px', borderRadius: 14, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', background: state.vulnExpanded ? 'var(--orange-dim)' : 'var(--bg-card)', color: state.vulnExpanded ? 'var(--orange)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', transition: 'all 0.15s' }}>
                  {state.vulnExpanded ? '▼ Show Less' : '▶ Show All'} ({directOnlyFiltered.length})
                </button>
              )}
            </div>
            {/* List View */}
            {state.viewMode === 'list' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(state.vulnExpanded ? directOnlyFiltered : directOnlyFiltered.slice(0, 10)).map(v => (
                  <div key={v.cve_id} onClick={() => dispatch({ type: 'SET_SELECTED', payload: state.selected===v.cve_id?null:v.cve_id })} style={{ background: state.selected===v.cve_id ? 'var(--orange-dim)' : 'var(--bg-card)', border: `1px solid ${state.selected===v.cve_id ? 'var(--orange)' : 'var(--border)'}`, borderLeft: `3px solid ${SEV_COLOR[v.severity]}`, borderRadius: 'var(--radius)', padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span onClick={(e) => { e.stopPropagation(); handleDeepScan(pkgName(v), pkgVersion(v), result.ecosystem) }} style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--blue)', cursor: 'pointer', textDecoration: 'underline' }}>{pkgName(v)}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>v{pkgVersion(v)}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--blue)' }}>{v.cve_id}</span>
                      {v.source && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'var(--purple-dim)', border: '1px solid var(--purple-border)', color: 'var(--purple)' }} title="Vulnerability source">{v.source}</span>}
                      {v.is_direct !== undefined && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: v.is_direct ? 'var(--green-dim)' : 'var(--yellow-dim)', border: `1px solid ${v.is_direct ? 'var(--green)' : 'var(--yellow)'}`, color: v.is_direct ? 'var(--green)' : 'var(--yellow)' }}>{v.is_direct ? 'DIRECT' : 'TRANSITIVE'}</span>}
                      <span style={{ flex: 1 }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: SEV_COLOR[v.severity] }}>CVSS {v.cvss_score}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 4, background: SEV_DIM[v.severity], border: `1px solid ${SEV_COLOR[v.severity]}44`, color: SEV_COLOR[v.severity] }}>{v.severity}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>{v.description}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Fix:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)', fontWeight: 600 }}>{fixText(v)}</span>
                      {(v.fix_version || v.fix) && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 3, background: 'var(--green-dim)', color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>FIX AVAILABLE</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Grouped View (Package-centric) */}
            {state.viewMode === 'grouped' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(state.vulnExpanded ? groupedByPackage : groupedByPackage.slice(0, 8)).map((group, idx) => {
                  const isExpanded = state.expandedPackages.has(group.package)
                  return (
                    <div key={idx} style={{ background: 'var(--bg-card)', border: `1px solid ${SEV_COLOR[group.highestSeverity]}44`, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                      {/* Package Header */}
                      <div onClick={() => togglePackageExpand(group.package)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16, cursor: 'pointer', background: SEV_DIM[group.highestSeverity] }}>
                        <span style={{ fontSize: 12, color: SEV_COLOR[group.highestSeverity] }}>{isExpanded ? '▼' : '▶'}</span>
                        <span onClick={(e) => { e.stopPropagation(); handleDeepScan(group.package, group.version, result.ecosystem) }} style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--blue)', cursor: 'pointer', textDecoration: 'underline' }}>{group.package}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>v{group.version}</span>
                        <span style={{ flex: 1 }} />
                        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 4, background: SEV_DIM[group.highestSeverity], border: `1px solid ${SEV_COLOR[group.highestSeverity]}44`, color: SEV_COLOR[group.highestSeverity] }}>{group.highestSeverity}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{group.vulnerabilities.length} CVEs</span>
                      </div>
                      {/* CVE List (expandable) */}
                      {isExpanded && (
                        <div style={{ padding: 12, borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {group.vulnerabilities.map(v => (
                              <div key={v.cve_id} onClick={() => dispatch({ type: 'SET_SELECTED', payload: v.cve_id })} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 10, background: state.selected === v.cve_id ? 'var(--orange-dim)' : 'var(--bg-card)', border: `1px solid ${state.selected === v.cve_id ? 'var(--orange)' : 'var(--border)'}`, borderRadius: 4, cursor: 'pointer' }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--blue)', fontWeight: 700 }}>{v.cve_id}</span>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: SEV_DIM[v.severity], border: `1px solid ${SEV_COLOR[v.severity]}44`, color: SEV_COLOR[v.severity] }}>{v.severity}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: SEV_COLOR[v.severity], fontWeight: 700 }}>CVSS {v.cvss_score}</span>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.description?.slice(0, 80)}...</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Dependency Graph */}
        {state.tab === 'tree' && <DependencyGraph data={result} />}

        {/* Tab: Fix Suggestions */}
        {state.tab === 'fixes' && (
          <div>
            {/* Deduplicated by package name, showing most severe */}
            {dedupedFixes.map((v, i) => (
              <div key={v.cve_id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--orange-dim)', border: '1px solid var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--orange)' }}>{i+1}</div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, flex: 1 }}>{pkgName(v)}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 4, background: SEV_DIM[v.severity], color: SEV_COLOR[v.severity] }}>{v.severity}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: SEV_COLOR[v.severity] }}>CVSS {v.cvss_score}</span>
                  <span style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>→ v{v.fix_version}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{v.description}</div>
                <div style={{ background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{installCmd(v, result.ecosystem)}</span>
                  <button onClick={() => navigator.clipboard?.writeText(installCmd(v, result.ecosystem))} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}>copy</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="analytics-right" style={{ borderLeft: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg-panel)', overflowX: 'auto' }}>
        {/* CVE Detail */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>CVE Details</span>
            {selectedVuln && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 4, background: SEV_DIM[selectedVuln.severity], color: SEV_COLOR[selectedVuln.severity] }}>{selectedVuln.severity}</span>}
            {selectedVuln && <span onClick={() => dispatch({ type: 'SET_SELECTED', payload: null })} style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14 }}>✕</span>}
          </div>
          <div style={{ padding: 14 }}>
            {!selectedVuln ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, gap: 8 }}>
                <span style={{ fontSize: 24 }}>🔍</span>
                <span>Click a vulnerability to see details</span>
              </div>
            ) : (
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{pkgName(selectedVuln)}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>v{pkgVersion(selectedVuln)}</div>
                {[['CVE ID',<span style={{color:'var(--blue)',fontFamily:'var(--font-mono)',fontSize:12}}>{selectedVuln.cve_id}</span>],
                  ['CVSS Score', <div><span style={{fontFamily:'var(--font-mono)',fontSize:22,fontWeight:700,color:SEV_COLOR[selectedVuln.severity]}}>{selectedVuln.cvss_score}</span><div style={{marginTop:4,height:4,background:'var(--border)',borderRadius:2,overflow:'hidden'}}><div style={{height:'100%',width:`${(selectedVuln.cvss_score/10)*100}%`,background:`linear-gradient(90deg,var(--green),var(--yellow),var(--red))`,borderRadius:2}}/></div></div>],
                  ['Description', <span style={{fontSize:12,color:'var(--text-secondary)'}}>{selectedVuln.description}</span>],
                ].map(([label, val]) => (
                  <div key={label} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{label}</div>
                    {val}
                  </div>
                ))}
                <div style={{ background: 'var(--vuln-bg)', border: '1px solid var(--vuln-border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>IMPACT</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selectedVuln.description}</div>
                </div>
                {selectedVuln.fix_version && (
                  <div style={{ background: 'var(--green-dim)', border: '1px solid var(--fix-border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>RECOMMENDED FIX</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)' }}>{fixText(selectedVuln)}</div>
                    <div style={{ marginTop: 8, background: 'var(--code-bg)', borderRadius: 4, padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{installCmd(selectedVuln, result.ecosystem)}</span>
                      <button onClick={() => navigator.clipboard?.writeText(installCmd(selectedVuln, result.ecosystem))} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 10 }}>Copy</button>
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>REFERENCES</div>
                  {[`nvd.nist.gov/vuln/detail/${selectedVuln.cve_id}`,`osv.dev/${selectedVuln.cve_id}`].map(ref => (
                    <a key={ref} href={`https://${ref}`} target="_blank" rel="noreferrer" style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--blue)', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>↗ {ref}</a>
                  ))}
                </div>
                <button style={{ width: '100%', marginTop: 14, padding: 10, borderRadius: 'var(--radius)', background: 'var(--green-dim)', border: '1px solid var(--fix-border)', color: 'var(--green)', fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>✓ Create Fix PR</button>
              </div>
            )}
          </div>
        </div>

        {/* Risk Score Calculation */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Risk Score Calculation</span>
          </div>
          <div style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
              Risk score is calculated based on CVSS severity weights:
            </div>
            {[
              { severity: 'CRITICAL', weight: 25, count: counts.CRITICAL, points: counts.CRITICAL * 25 },
              { severity: 'HIGH', weight: 10, count: counts.HIGH, points: counts.HIGH * 10 },
              { severity: 'MEDIUM', weight: 4, count: counts.MEDIUM, points: counts.MEDIUM * 4 },
              { severity: 'LOW', weight: 1, count: counts.LOW, points: counts.LOW * 1 }
            ].map(({ severity, weight, count, points }) => (
              <div key={severity} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 11 }}>
                <span style={{ width: 60, color: SEV_COLOR[severity], fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{severity}</span>
                <span style={{ color: 'var(--text-muted)' }}>{count} × {weight}</span>
                <span style={{ flex: 1, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>= {points}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL</span>
              <span style={{ flex: 1, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--red)' }}>
                {counts.CRITICAL*25 + counts.HIGH*10 + counts.MEDIUM*4 + counts.LOW*1}
              </span>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
              Capped at 100/100
            </div>
          </div>
        </div>

        {/* Risk Breakdown */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Risk Breakdown</span>
          </div>
          <div style={{ padding: 14 }}>
            {['CRITICAL','HIGH','MEDIUM','LOW'].map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 11 }}>
                <span style={{ width: 60, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s}</span>
                <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (counts[s]||0) * 25)}%`, background: SEV_COLOR[s], borderRadius: 3 }} />
                </div>
                <span style={{ color: SEV_COLOR[s], fontFamily: 'var(--font-mono)', fontWeight: 700, width: 16 }}>{counts[s]||0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scan Info */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Scan Info</span>
          </div>
          <div style={{ padding: '10px 14px' }}>
            {[['Direct Packages', directPkgs],['Transitive Packages', transitivePkgs],['Total Packages', totalPkgs],['Vulnerabilities', vulns.length],['Source', result.project_name||'package.json'],['Databases', 'NVD + OSV']].map(([l,v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function countNodes(node, count = 0) {
  if (!node) return count
  count++
  if (node.dependencies) node.dependencies.forEach(d => { count = countNodes(d, count) })
  return count
}
