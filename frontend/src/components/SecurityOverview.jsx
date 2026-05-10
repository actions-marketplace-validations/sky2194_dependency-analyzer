import React from 'react'
import tokens from '../theme/tokens'
import { getRiskColor } from '../theme/tokens'

export default function SecurityOverview({ summary, riskScore }) {
  const riskColor = getRiskColor(riskScore)

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18, marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)', letterSpacing: 0.8, textTransform: 'uppercase' }}>
        Security Overview
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: riskColor, fontFamily: 'var(--font-mono)' }}>{riskScore}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Risk Score</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{summary?.risk_label || 'Unknown'}</div>
        </div>
        <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: tokens.status.error, fontFamily: 'var(--font-mono)' }}>{summary?.priority_fix_count || 0}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Priority Fixes</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Critical + High</div>
        </div>
        <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: tokens.status.success, fontFamily: 'var(--font-mono)' }}>{summary?.secure_package_count || 0}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Secure Packages</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>No vulnerabilities</div>
        </div>
        <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: tokens.status.warning, fontFamily: 'var(--font-mono)' }}>{summary?.vulnerable_package_count || 0}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Vulnerable Packages</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Have vulnerabilities</div>
        </div>
      </div>
    </div>
  )
}
