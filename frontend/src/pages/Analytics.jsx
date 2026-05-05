import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
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

export default function Analytics() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [tab, setTab] = useState('vulns')
  const [sevFilter, setSevFilter] = useState('ALL')
  const [selected, setSelected] = useState(null)

  const result = state?.result

  if (!result) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>No scan results.</p>
      <button onClick={() => navigate('/scan')} style={{ padding: '10px 20px', background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 700 }}>← Run a Scan</button>
    </div>
  )

  const vulns = result.vulnerabilities || []
  const counts = ['CRITICAL','HIGH','MEDIUM','LOW'].reduce((a,s) => ({...a, [s]: vulns.filter(v=>v.severity===s).length}), {})
  const filtered = sevFilter === 'ALL' ? vulns : vulns.filter(v => v.severity === sevFilter)
  const selectedVuln = vulns.find(v => v.cve_id === selected)
  const riskScore = Math.min(100, Math.round((counts.CRITICAL*25 + counts.HIGH*10 + counts.MEDIUM*4 + counts.LOW*1)))
  const tree = result.dependency_tree || result.graph
  const totalPkgs = result.total_packages || (tree ? Math.max(0, countNodes(tree) - 1) : 0)

  const exportReport = async (type) => {
    try {
      const res = await fetch(`${API_BASE}/api/export/${type}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(result) })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `sca-report.${type==='pdf'?'html':'csv'}`; a.click()
      URL.revokeObjectURL(url)
    } catch {}
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', height: 'calc(100vh - 52px)' }}>
      {/* MAIN */}
      <div style={{ overflowY: 'auto', padding: '24px 28px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: -0.4, marginBottom: 4 }}>
              Security Risk Overview
              <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 4, background: 'rgba(224,92,42,0.1)', border: '1px solid rgba(224,92,42,0.3)', color: 'var(--orange)', verticalAlign: 'middle' }}>DEMO MODE</span>
            </h1>
            <div style={{ fontSize: 12, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
              <strong>{vulns.length} vulnerabilities detected</strong> across {totalPkgs} packages — {counts.CRITICAL > 0 ? <span>{counts.CRITICAL} critical requires immediate attention</span> : 'no critical issues'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => navigate('/scan')} style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>✕ Compare Scans</button>
            <button onClick={() => exportReport('pdf')} style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>↓ Export</button>
            <button onClick={() => navigate('/scan')} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 6, background: 'var(--orange)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>🔄 New Scan</button>
          </div>
        </div>

        {/* Risk Strip */}
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
              <div key={v.cve_id} onClick={() => setSelected(v.cve_id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderTop: '1px solid var(--border)', cursor: 'pointer' }}>
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
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          {[['vulns',`Vulnerabilities`,vulns.length],['tree','Dependency Graph',null],['fixes','Fix Suggestions',null]].map(([id,label,count]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: tab===id ? 'var(--text)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: `2px solid ${tab===id ? 'var(--orange)' : 'transparent'}`, marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}>
              {label}
              {count !== null && <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 8, background: 'var(--red-dim)', color: 'var(--red)' }}>{count}</span>}
            </button>
          ))}
        </div>

        {/* Tab: Vulnerabilities */}
        {tab === 'vulns' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {['ALL','CRITICAL','HIGH','MEDIUM','LOW'].map(s => (
                <button key={s} onClick={() => setSevFilter(s)} style={{ padding: '4px 10px', borderRadius: 14, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', background: sevFilter===s ? 'var(--orange-dim)' : 'var(--bg-card)', color: sevFilter===s ? 'var(--orange)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', transition: 'all 0.15s' }}>
                  {s}{s!=='ALL' && ` (${counts[s]||0})`}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(v => (
                <div key={v.cve_id} onClick={() => setSelected(selected===v.cve_id?null:v.cve_id)} style={{ background: selected===v.cve_id ? 'var(--orange-dim)' : 'var(--bg-card)', border: `1px solid ${selected===v.cve_id ? 'var(--orange)' : 'var(--border)'}`, borderLeft: `3px solid ${SEV_COLOR[v.severity]}`, borderRadius: 'var(--radius)', padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>{pkgName(v)}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>v{pkgVersion(v)}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--blue)' }}>{v.cve_id}</span>
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
          </div>
        )}

        {/* Tab: Dependency Graph */}
        {tab === 'tree' && <DependencyGraph data={result} />}

        {/* Tab: Fix Suggestions */}
        {tab === 'fixes' && (
          <div>
            {vulns.filter(v=>v.fix_version).map((v,i) => (
              <div key={v.cve_id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--orange-dim)', border: '1px solid rgba(224,92,42,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--orange)' }}>{i+1}</div>
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
      <div style={{ overflowY: 'auto', borderLeft: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg-panel)' }}>
        {/* CVE Detail */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', flex: '1 1 auto' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>CVE Details</span>
            {selectedVuln && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 4, background: SEV_DIM[selectedVuln.severity], color: SEV_COLOR[selectedVuln.severity] }}>{selectedVuln.severity}</span>}
            {selectedVuln && <span onClick={() => setSelected(null)} style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14 }}>✕</span>}
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
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>IMPACT</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selectedVuln.description}</div>
                </div>
                {selectedVuln.fix_version && (
                  <div style={{ background: 'var(--green-dim)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
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
                <button style={{ width: '100%', marginTop: 14, padding: 10, borderRadius: 'var(--radius)', background: 'var(--green-dim)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--green)', fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>✓ Create Fix PR</button>
              </div>
            )}
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
            {[['Packages', `${totalPkgs} resolved`],['Vulnerabilities', vulns.length],['Source', result.project_name||'package.json'],['Databases', 'NVD + OSV']].map(([l,v]) => (
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
