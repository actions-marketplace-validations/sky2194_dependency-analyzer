import React from 'react'
import { useNavigate } from 'react-router-dom'
import tokens from '../theme/tokens'

export default function SnapshotErrorState({ errors, onRetry }) {
  const navigate = useNavigate()

  return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <p style={{ color: tokens.status.error, marginBottom: 16, fontSize: 16, fontWeight: 600 }}>
        Invalid scan result format
      </p>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 12, maxWidth: 400, margin: '0 auto 24px' }}>
        {errors.join(', ')}
      </p>
      <button 
        onClick={() => navigate('/scan')}
        style={{ 
          padding: '10px 20px', 
          background: tokens.accent.primary, 
          color: 'var(--white)', 
          border: 'none', 
          borderRadius: tokens.radius.md, 
          cursor: 'pointer', 
          fontFamily: tokens.font.ui, 
          fontWeight: 700 
        }}
      >
        ← Run a Scan
      </button>
    </div>
  )
}
