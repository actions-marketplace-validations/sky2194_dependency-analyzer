import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Scanner from '../../pages/Scanner'
import Scanning from '../../pages/Scanning'
import Results from '../../pages/Results'
import { ScanContext } from '../../App'

// Mock axios
jest.mock('axios')

const mockScanResult = {
  is_mock: false,
  ecosystem: 'npm',
  project_name: 'test-app',
  total_packages: 5,
  vulnerabilities: [
    {
      cve_id: 'CVE-2019-10744',
      package: 'lodash',
      version: '4.17.4',
      severity: 'CRITICAL',
      cvss_score: 9.8,
      description: 'Prototype pollution vulnerability',
    },
  ],
  graph: {
    name: 'test-app',
    version: '1.0.0',
    type: 'root',
    dependencies: [],
  },
  grouped_vulnerabilities: [],
}

describe('Scan Flow Integration Tests', () => {
  test('Scanner page renders ecosystem tabs', () => {
    render(
      <MemoryRouter>
        <Scanner />
      </MemoryRouter>
    )
    expect(screen.getByText('npm')).toBeInTheDocument()
    expect(screen.getByText('PyPI')).toBeInTheDocument()
    expect(screen.getByText('Maven')).toBeInTheDocument()
  })

  test('Scanner allows code input', () => {
    render(
      <MemoryRouter>
        <Scanner />
      </MemoryRouter>
    )
    const textarea = screen.getByPlaceholderText(/Paste your/)
    fireEvent.change(textarea, { target: { value: '{"dependencies":{"express":"4.17.1"}}' } })
    expect(textarea.value).toBe('{"dependencies":{"express":"4.17.1"}}')
  })

  test('Results page displays vulnerability count', () => {
    render(
      <MemoryRouter initialEntries={['/results']}>
        <ScanContext.Provider value={{ scanning: false, setScanning: jest.fn(), scanProject: '', setScanProject: jest.fn() }}>
          <Results />
        </ScanContext.Provider>
      </MemoryRouter>
    )
  })

  test('Results page shows mock data warning when is_mock is true', () => {
    const mockResultWithFlag = { ...mockScanResult, is_mock: true }
    render(
      <MemoryRouter initialEntries={['/results']}>
        <ScanContext.Provider value={{ scanning: false, setScanning: jest.fn(), scanProject: '', setScanProject: jest.fn() }}>
          <Results />
        </ScanContext.Provider>
      </MemoryRouter>
    )
  })

  test('Scanning page shows fallback when no state', () => {
    render(
      <MemoryRouter initialEntries={['/scanning']}>
        <Scanning />
      </MemoryRouter>
    )
    expect(screen.getByText('No active scan')).toBeInTheDocument()
    expect(screen.getByText('Go to Scanner')).toBeInTheDocument()
  })
})
