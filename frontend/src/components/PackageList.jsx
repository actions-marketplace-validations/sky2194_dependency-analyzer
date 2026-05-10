import React from 'react'
import tokens from '../theme/tokens'

export default function PackageList({ packages, onPackageClick }) {
  if (!Array.isArray(packages)) {
    return null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {packages.map((pkg, idx) => {
        const hasVulns = pkg.vulnerabilities && pkg.vulnerabilities.length > 0
        const borderColor = hasVulns ? tokens.severity.critical : tokens.status.success
        const bgColor = hasVulns ? 'var(--red-dim)' : 'var(--green-dim)'
        const textColor = hasVulns ? tokens.severity.critical : tokens.status.success

        return (
          <div 
            key={idx} 
            style={{ 
              background: 'var(--bg-card)', 
              border: `1px solid ${borderColor}44`, 
              borderRadius: 'var(--radius)', 
              padding: 16, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8 
            }}
          >
            <span style={{ 
              fontSize: 12, 
              fontWeight: 700, 
              padding: '2px 8px', 
              borderRadius: 4, 
              background: bgColor, 
              color: textColor 
            }}>
              {hasVulns ? `${pkg.vulnerabilities.length} CVEs` : '✓ Secure'}
            </span>
            <span 
              onClick={(e) => { 
                e.stopPropagation(); 
                onPackageClick && onPackageClick(pkg.package, pkg.version); 
              }} 
              style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: 14, 
                fontWeight: 700, 
                color: 'var(--blue)', 
                cursor: 'pointer', 
                textDecoration: 'underline' 
              }}
            >
              {pkg.package}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
              v{pkg.version}
            </span>
            {pkg.is_direct && (
              <span style={{ 
                fontSize: 10, 
                fontWeight: 700, 
                padding: '1px 6px', 
                borderRadius: 3, 
                background: 'var(--blue-dim)', 
                color: 'var(--blue)', 
                fontFamily: 'var(--font-mono)' 
              }}>
                DIRECT
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
