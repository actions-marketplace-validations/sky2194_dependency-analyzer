import { render, screen } from '@testing-library/react'
import SeverityBadge from '../../components/SeverityBadge'

describe('SeverityBadge Component', () => {
  test('renders CRITICAL badge correctly', () => {
    render(<SeverityBadge level="CRITICAL" />)
    const badge = screen.getByText('CRITICAL')
    expect(badge).toBeInTheDocument()
  })

  test('renders HIGH badge correctly', () => {
    render(<SeverityBadge level="HIGH" />)
    const badge = screen.getByText('HIGH')
    expect(badge).toBeInTheDocument()
  })

  test('renders MEDIUM badge correctly', () => {
    render(<SeverityBadge level="MEDIUM" />)
    const badge = screen.getByText('MEDIUM')
    expect(badge).toBeInTheDocument()
  })

  test('renders LOW badge correctly', () => {
    render(<SeverityBadge level="LOW" />)
    const badge = screen.getByText('LOW')
    expect(badge).toBeInTheDocument()
  })

  test('handles unknown severity gracefully', () => {
    render(<SeverityBadge level="UNKNOWN" />)
    const badge = screen.getByText('UNKNOWN')
    expect(badge).toBeInTheDocument()
  })
})
