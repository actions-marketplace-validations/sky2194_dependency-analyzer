import { useState, useMemo } from 'react'

const SEV_COLOR = {
  CRITICAL: 'var(--critical)',
  HIGH:     'var(--high)',
  MEDIUM:   'var(--medium)',
  LOW:      'var(--low)',
}

const SEV_FILL = {
  CRITICAL: 'rgba(255,59,92,0.12)',
  HIGH:     'rgba(255,140,66,0.12)',
  MEDIUM:   'rgba(245,200,66,0.12)',
  LOW:      'rgba(62,207,142,0.12)',
}

function flatten(node, depth = 0, parentName = null, out = []) {
  if (!node) return out
  out.push({
    name: node.name,
    version: node.version,
    depth,
    type: node.type || (depth === 0 ? 'root' : depth === 1 ? 'direct' : 'transitive'),
    parent: parentName,
    vulns: node.vulnerabilities || [],
  })
  if (node.dependencies) {
    for (const d of node.dependencies) flatten(d, depth + 1, node.name, out)
  }
  return out
}

function topSeverity(vulns) {
  if (!vulns || !vulns.length) return null
  const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
  for (const s of order) {
    const v = vulns.find(x => (x.severity || '').toUpperCase() === s)
    if (v) return { sev: s, cvss: v.cvss_score, fix: v.fix_version }
  }
  return null
}

export default function DependencyGraph({ data }) {
  const [showVulnOnly, setShowVulnOnly] = useState(false)
  const tree = data?.dependency_tree || data?.graph

  const layout = useMemo(() => {
    if (!tree) return null
    const all = flatten(tree)

    const filtered = showVulnOnly
      ? all.filter(n => {
          if (n.depth === 0) return true
          if (n.vulns.length > 0) return true
          // keep parents of vulnerable transitives
          return all.some(c => c.parent === n.name && c.vulns.length > 0)
        })
      : all

    const root = filtered.find(n => n.depth === 0)
    if (!root) return null

    const directs = filtered.filter(n => n.depth === 1)
    const transitives = filtered.filter(n => n.depth >= 2)

    const W = 1000
    const H = 540
    const rootX = W / 2
    const rootY = 80
    const directY = 250
    const transY = 440

    const dGap = directs.length > 1 ? Math.min(180, (W - 200) / Math.max(1, directs.length - 1)) : 0
    const dStartX = rootX - (directs.length - 1) * dGap / 2

    const placedDirects = directs.map((d, i) => ({
      ...d,
      x: dStartX + i * dGap,
      y: directY,
    }))

    const placedTrans = transitives.map((t, i) => {
      const parent = placedDirects.find(p => p.name === t.parent)
      const siblings = transitives.filter(x => x.parent === t.parent)
      const idx = siblings.findIndex(x => x.name === t.name && x.version === t.version)
      const total = siblings.length
      const baseX = parent ? parent.x : (W / (transitives.length + 1)) * (i + 1)
      const offset = total > 1 ? (idx - (total - 1) / 2) * 100 : 0
      return {
        ...t,
        x: baseX + offset,
        y: transY,
        parentX: parent?.x,
        parentY: parent?.y,
      }
    })

    return { root: { ...root, x: rootX, y: rootY }, directs: placedDirects, transitives: placedTrans, W, H }
  }, [tree, showVulnOnly])

  if (!tree || !layout) {
    return (
      <div style={{ color: 'var(--text-secondary)', fontSize: 13, padding: 24, textAlign: 'center' }}>
        No dependency tree available.
      </div>
    )
  }

  const { root, directs, transitives, W, H } = layout

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowVulnOnly(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
            borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12,
            background: showVulnOnly ? 'rgba(255,59,92,0.10)' : 'var(--bg-elevated)',
            border: `1px solid ${showVulnOnly ? 'rgba(255,59,92,0.40)' : 'var(--border)'}`,
            color: showVulnOnly ? 'var(--critical)' : 'var(--text-secondary)',
            transition: 'all 0.15s',
          }}
        >
          <span style={{
            width: 12, height: 12, borderRadius: 3, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            border: `2px solid ${showVulnOnly ? 'var(--critical)' : 'var(--text-muted)'}`,
            background: showVulnOnly ? 'var(--critical)' : 'transparent',
            fontSize: 8, color: '#fff',
          }}>{showVulnOnly ? '✓' : ''}</span>
          Show only vulnerable
        </button>
        <div style={{ display: 'flex', gap: 14, marginLeft: 'auto', fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {[
            ['var(--critical)', 'Critical'],
            ['var(--high)',     'High'],
            ['var(--medium)',   'Medium'],
            ['var(--low)',      'Safe'],
          ].map(([c, l]) => (
            <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
            </span>
          ))}
        </div>
      </div>

      {/* SVG canvas */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 16, overflow: 'auto', maxHeight: '65vh',
      }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', minWidth: 700, fontFamily: 'var(--font-mono)' }}
        >
          {/* root → direct edges */}
          {directs.map((d, i) => (
            <line
              key={`re-${i}`}
              x1={root.x} y1={root.y + 22}
              x2={d.x}    y2={d.y - 22}
              stroke="var(--border-mid)" strokeWidth="1"
              strokeDasharray="3 4" opacity="0.6"
            />
          ))}

          {/* direct → transitive edges */}
          {transitives.map((t, i) => t.parentX != null && (
            <line
              key={`te-${i}`}
              x1={t.parentX} y1={t.parentY + 22}
              x2={t.x}       y2={t.y - 22}
              stroke="var(--border-mid)" strokeWidth="1"
              strokeDasharray="3 4" opacity="0.5"
            />
          ))}

          {/* edge labels: direct */}
          {directs.map((d, i) => (
            <text
              key={`rl-${i}`}
              x={(root.x + d.x) / 2}
              y={(root.y + d.y) / 2 - 4}
              fontSize="10" fill="var(--text-muted)" textAnchor="middle"
            >direct</text>
          ))}

          {/* edge labels: transitive */}
          {transitives.map((t, i) => t.parentX != null && (
            <text
              key={`tl-${i}`}
              x={(t.parentX + t.x) / 2}
              y={(t.parentY + t.y) / 2 - 4}
              fontSize="10" fill="var(--text-muted)" textAnchor="middle"
            >transitive</text>
          ))}

          {/* root node */}
          <g>
            <circle cx={root.x} cy={root.y} r="22"
              fill="rgba(79,142,247,0.10)" stroke="var(--accent)" strokeWidth="1.5" />
            <text x={root.x} y={root.y + 38} fontSize="11" fill="var(--text)"
              textAnchor="middle" fontWeight="600">{root.name}</text>
          </g>

          {/* direct + transitive nodes */}
          {[...directs, ...transitives].map((n, i) => {
            const sev = topSeverity(n.vulns)
            const col = sev ? SEV_COLOR[sev.sev] : 'var(--low)'
            const fill = sev ? SEV_FILL[sev.sev] : 'rgba(62,207,142,0.06)'
            const isVuln = !!sev
            return (
              <g key={`n-${i}`}>
                {isVuln && (
                  <circle cx={n.x} cy={n.y} r="28" fill={col} opacity="0.18"
                    style={{ filter: 'blur(8px)' }} />
                )}
                <circle cx={n.x} cy={n.y} r="20" fill={fill}
                  stroke={col} strokeWidth="1.5" />
                <text x={n.x} y={n.y + 36} fontSize="11" fill="var(--text)"
                  textAnchor="middle" fontWeight="600">{n.name}</text>
                <text x={n.x} y={n.y + 50} fontSize="10" fill="var(--text-secondary)"
                  textAnchor="middle">{n.version}</text>
                {sev?.cvss && (
                  <g>
                    <rect x={n.x + 12} y={n.y - 30} width="46" height="14" rx="3"
                      fill={col} opacity="0.22" />
                    <text x={n.x + 35} y={n.y - 20} fontSize="9" fill={col}
                      textAnchor="middle" fontWeight="700">CVSS {sev.cvss}</text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
