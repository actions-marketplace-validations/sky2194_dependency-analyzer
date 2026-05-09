import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'

describe('App Component', () => {
  test('renders navigation on non-landing pages', () => {
    render(
      <MemoryRouter initialEntries={['/scan']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText('DepAnalyzer')).toBeInTheDocument()
    expect(screen.getByText('Scanner')).toBeInTheDocument()
  })

  test('does not render navigation on landing page', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.queryByText('Scanner')).not.toBeInTheDocument()
  })

  test('renders theme toggle button', () => {
    render(
      <MemoryRouter initialEntries={['/scan']}>
        <App />
      </MemoryRouter>
    )
    const themeButton = screen.getByRole('button')
    expect(themeButton).toBeInTheDocument()
  })

  test('toggles theme on button click', () => {
    render(
      <MemoryRouter initialEntries={['/scan']}>
        <App />
      </MemoryRouter>
    )
    const themeButton = screen.getByRole('button')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    
    themeButton.click()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
