import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'

describe('Theme Validation Tests', () => {
  beforeEach(() => {
    // Reset theme before each test
    localStorage.removeItem('theme')
    document.documentElement.removeAttribute('data-theme')
  })

  test('initializes with dark theme by default', () => {
    render(
      <MemoryRouter initialEntries={['/scan']}>
        <App />
      </MemoryRouter>
    )
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  test('initializes with light theme if saved in localStorage', () => {
    localStorage.setItem('theme', 'light')
    render(
      <MemoryRouter initialEntries={['/scan']}>
        <App />
      </MemoryRouter>
    )
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  test('toggles from dark to light theme', () => {
    render(
      <MemoryRouter initialEntries={['/scan']}>
        <App />
      </MemoryRouter>
    )
    
    const themeButton = screen.getByRole('button')
    fireEvent.click(themeButton)
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem('theme')).toBe('light')
  })

  test('toggles from light to dark theme', () => {
    localStorage.setItem('theme', 'light')
    render(
      <MemoryRouter initialEntries={['/scan']}>
        <App />
      </MemoryRouter>
    )
    
    const themeButton = screen.getByRole('button')
    fireEvent.click(themeButton)
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  test('theme button shows correct icon', () => {
    render(
      <MemoryRouter initialEntries={['/scan']}>
        <App />
      </MemoryRouter>
    )
    
    const themeButton = screen.getByRole('button')
    expect(themeButton).toHaveTextContent('☀️')
    
    fireEvent.click(themeButton)
    expect(themeButton).toHaveTextContent('🌙')
  })

  test('persists theme preference across page reloads', () => {
    render(
      <MemoryRouter initialEntries={['/scan']}>
        <App />
      </MemoryRouter>
    )
    
    const themeButton = screen.getByRole('button')
    fireEvent.click(themeButton)
    
    // Simulate page reload by checking localStorage
    expect(localStorage.getItem('theme')).toBe('light')
  })
})
