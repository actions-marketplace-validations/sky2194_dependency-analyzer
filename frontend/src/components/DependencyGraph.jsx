import { useState } from 'react'
import StepBanner from './StepBanner'

function Node({ node, depth = 0, vulnOnly }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.dependencies?.length > 0
  const vulns = node.vulnerabilities || []
  const isVuln = vulns.length > 0
  const topSev = vulns[0]?.severity || ''
  const topCVSS = vulns[0]?.cvss_score
  const glowColor = topSev === 'CRITICAL' ? '#ef4444' : topSev === 'HIGH' ? '#f97316' : topSev === 'MEDIUM' ? '#eab308' : null
  const dotColor = isVuln ? (glowColor || '#ef4444') : depth === 0 ? 'var(--accent)' : hasChildren ? '#f59e0b' : '#22c55e'
  const children = vulnOnly
    ? (node.dependencies || []).filter(c => c.vulnerabilities?.length > 0)
    : node.dependencies || []

  return (
    <div>
      <div onClick={() => hasChildren && setExpanded(e => !e)} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', marginLeft: depth * 20,
        borderRadius: 6, cursor: hasChildren ? 'pointer' : 'default',
        background: isVuln ? 'var(--vuln-bg)' : 'transparent',
        borderLeft: isVuln ? `3px solid ${glowColor}` : '3px solid transparent',
        boxShadow: isVuln && topSev === 'CRITICAL' ? `0 0 10px ${glowColor}33` : 'none',
        marginBottom: 3, transition: 'all 0.15s',
      }}
        onMouseEnter={e => { if (!isVuln) e.currentTarget.style.background = 'var(--surface2)' }}
        onMouseLeave={e => { if (!isVuln) e.currentTarget.style.background = 'transparent' }}
      >
        {depth > 0 && <span style={{ color: 'var(--border)', fontSize: 11 }}>└─</span>}
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0, boxShadow: isVuln ? `0 0 6px ${glowColor}` : 'none' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: depth === 0 ? 700 : 400 }}>{node.name}</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>@{node.version}</span>
        {node.type === 'direct' && <span style={{ fontSize: 10, background: 'var(--fix-bg)', color: '#22c55e', border: '1px solid var(--fix-border)', borderRadius: 3, padding: '1px 6px' }}>direct</span>}
        {node.type === 'transitive' && <span style={{ fontSize: 10, background: 'var(--warn-bg)', color: '#f59e0b', border: '1px solid var(--warn-border)', borderRadius: 3, padding: '1px 6px' }}>transitive</span>}
        {isVuln && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {topCVSS && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: glowColor }}>CVSS {topCVSS}</span>}
            <span style={{ fontSize: 10, background: glowColor + '22', color: glowColor, border: `1px solid ${glowColor}55`, borderRadius: 3, padding: '1px 6px', fontWeight: 600 }}>{topSev}</span>
            <span style={{ fontSize: 10, background: 'var(--fix-bg)', color: '#22c55e', border: '1px solid var(--fix-border)', borderRadius: 3, padding: '1px 6px' }}>Fix available</span>
          </span>
        )}
        {!isVuln && depth > 0 && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ok)' }}>✓</span>}
        {hasChildren && <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: isVuln ? 8 : 0 }}>{expanded ? '▲' : `▼ ${node.dependencies.length}`}</span>}
      </div>
      {expanded && children.map((child, i) => (
        <Node key={`${child.name}@${child.version}-${i}`} node={child} depth={depth + 1} vulnOnly={vulnOnly} />
      ))}
    </div>
  )
}

export default function DependencyGraph({ data }) {
  const [search, setSearch] = useState('')
  const [vulnOnly, setVulnOnly] = useState(false)
  const deps = data?.graph?.dependencies || []
  const vulnCount = deps.filter(d => d.vulnerabilities?.length > 0).length
  const filtered = search
    ? deps.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
    : vulnOnly ? deps.filter(d => d.vulnerabilities?.length > 0) : deps

  return (
    <div>
      <StepBanner icon="🌳" title="Dependency Tree"
        text={<>Every package — direct and transitive. Click to expand/collapse. ⚠️ = CVEs · ✓ = clean.</>}
      />
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter packages..."
          style={{ flex: 1, minWidth: 180, padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', outline: 'none' }}
        />
        <button onClick={() => setVulnOnly(v => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
          background: vulnOnly ? 'var(--vuln-bg)' : 'var(--surface)', border: `1px solid ${vulnOnly ? '#ef444466' : 'var(--border)'}`,
          color: vulnOnly ? '#ef4444' : 'var(--muted)', transition: 'all 0.15s',
        }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: vulnOnly ? '#ef4444' : 'var(--border)', transition: 'background 0.15s' }} />
          Show only vulnerable ({vulnCount})
        </button>
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
        <Node node={{ name: data?.project_name || 'project', version: '—', type: 'root', dependencies: filtered, vulnerabilities: [] }} depth={0} vulnOnly={vulnOnly} />
        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            {vulnOnly ? 'No vulnerable packages found 🎉' : `No packages match "${search}"`}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
        <span><span style={{ color: '#ef4444' }}>●</span> CVE</span>
        <span><span style={{ color: '#f59e0b' }}>●</span> Transitive</span>
        <span><span style={{ color: '#22c55e' }}>●</span> Clean</span>
        <span><span style={{ color: 'var(--accent)' }}>●</span> Root</span>
        <span style={{ marginLeft: 'auto' }}>Click to expand</span>
      </div>
    </div>
  )
}
