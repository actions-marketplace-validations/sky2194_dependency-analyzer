const SEVERITY_STYLES = {
  CRITICAL: { bg: 'var(--vuln-bg)', color: 'var(--red)', border: 'var(--vuln-border)' },
  HIGH:     { bg: 'var(--warn-bg)', color: 'var(--yellow)', border: 'var(--warn-border)' },
  MEDIUM:   { bg: 'var(--blue-dim)', color: 'var(--blue)', border: 'var(--border)' },
  LOW:      { bg: 'var(--green-dim)', color: 'var(--green)', border: 'var(--fix-border)' },
}
export default function SeverityBadge({ level }) {
  const c = SEVERITY_STYLES[level] || SEVERITY_STYLES.LOW
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>
      {level}
    </span>
  )
}
