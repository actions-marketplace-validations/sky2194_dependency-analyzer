import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const STEPS = [
  { icon: '📄', label: 'Parsing dependency file...' },
  { icon: '🌳', label: 'Resolving transitive dependencies...' },
  { icon: '🔗', label: 'Building dependency graph...' },
  { icon: '🔍', label: 'Scanning NVD database...' },
  { icon: '🛡️', label: 'Scanning OSV database...' },
  { icon: '📊', label: 'Calculating CVE paths...' },
]

export default function Scanning() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!state?.result && !state?.loading) { navigate('/'); return }
    const interval = setInterval(() => {
      setStep(s => {
        if (s >= STEPS.length - 1) { clearInterval(interval); return s }
        return s + 1
      })
    }, 900)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (step === STEPS.length - 1 && state?.result) {
      setTimeout(() => navigate('/results', { state: { result: state.result } }), 800)
    }
  }, [step, state])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 480, padding: 40, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Scanning Dependencies</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>{state?.filename || 'Analyzing your project...'}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STEPS.map((s, i) => {
            const isPast = i < step
            const isCurrent = i === step
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: isCurrent ? 'var(--surface2)' : 'transparent', border: isCurrent ? '1px solid var(--accent)' : '1px solid transparent', transition: 'all 0.3s' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${isPast ? 'var(--ok)' : isCurrent ? 'var(--accent)' : 'var(--border)'}`, background: isPast ? 'var(--ok)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, transition: 'all 0.3s', color: isPast ? '#fff' : isCurrent ? 'var(--accent)' : 'var(--muted)' }}>
                  {isPast ? '✓' : isCurrent ? '●' : ''}
                </div>
                <span style={{ fontSize: 13, color: isPast ? 'var(--ok)' : isCurrent ? 'var(--text)' : 'var(--muted)', transition: 'color 0.3s' }}>{s.icon} {s.label}</span>
                {isCurrent && (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                    {[0,1,2].map(d => <div key={d} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', animation: `bounce 0.8s ease-in-out ${d*0.15}s infinite` }} />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 24, background: 'var(--surface2)', borderRadius: 8, height: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--accent)', width: `${((step + 1) / STEPS.length) * 100}%`, transition: 'width 0.6s ease', borderRadius: 8 }} />
        </div>
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
          Step {step + 1} of {STEPS.length}
        </div>
      </div>
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }`}</style>
    </div>
  )
}
