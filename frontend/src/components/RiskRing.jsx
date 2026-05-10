import React from 'react'
import tokens, { getRiskColor } from '../theme/tokens'

export default function RiskRing({ score, size = 120 }) {
  const riskColor = getRiskColor(score)
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth="12"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={riskColor}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <span style={{ 
          fontSize: size * 0.25, 
          fontWeight: 700, 
          color: riskColor, 
          fontFamily: 'var(--font-mono)' 
        }}>
          {score}
        </span>
        <span style={{ fontSize: size * 0.08, color: 'var(--text-muted)' }}>
          RISK
        </span>
      </div>
    </div>
  )
}
