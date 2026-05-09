import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Scanner from '../../pages/Scanner'

describe('Responsive Design Validation Tests', () => {
  const mockViewport = (width, height) => {
    window.innerWidth = width
    window.innerHeight = height
    window.dispatchEvent(new Event('resize'))
  }

  test('Scanner renders on mobile viewport (375x667)', () => {
    mockViewport(375, 667)
    render(
      <MemoryRouter>
        <Scanner />
      </MemoryRouter>
    )
    expect(screen.getByText('Dependency Vulnerability Scanner')).toBeVisible()
  })

  test('Scanner renders on tablet viewport (768x1024)', () => {
    mockViewport(768, 1024)
    render(
      <MemoryRouter>
        <Scanner />
      </MemoryRouter>
    )
    expect(screen.getByText('Dependency Vulnerability Scanner')).toBeVisible()
  })

  test('Scanner renders on desktop viewport (1920x1080)', () => {
    mockViewport(1920, 1080)
    render(
      <MemoryRouter>
        <Scanner />
      </MemoryRouter>
    )
    expect(screen.getByText('Dependency Vulnerability Scanner')).toBeVisible()
    expect(screen.getByText('Severity Guide')).toBeVisible()
  })

  test('Scanner renders on large desktop viewport (2560x1440)', () => {
    mockViewport(2560, 1440)
    render(
      <MemoryRouter>
        <Scanner />
      </MemoryRouter>
    )
    expect(screen.getByText('Dependency Vulnerability Scanner')).toBeVisible()
  })
})
