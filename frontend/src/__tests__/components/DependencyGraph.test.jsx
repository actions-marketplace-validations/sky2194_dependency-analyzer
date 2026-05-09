import { render, screen } from '@testing-library/react'
import DependencyGraph from '../../components/DependencyGraph'

describe('DependencyGraph Component', () => {
  const mockData = {
    dependency_tree: {
      name: 'my-app',
      version: '1.0.0',
      type: 'root',
      dependencies: [
        {
          name: 'express',
          version: '4.17.1',
          type: 'direct',
          vulnerabilities: [],
          dependencies: [],
        },
        {
          name: 'lodash',
          version: '4.17.4',
          type: 'direct',
          vulnerabilities: [{ cve_id: 'CVE-2019-10744', severity: 'CRITICAL', cvss_score: 9.8 }],
          dependencies: [],
        },
      ],
    },
  }

  test('renders dependency graph with data', () => {
    render(<DependencyGraph data={mockData} />)
    expect(screen.getByText('my-app')).toBeInTheDocument()
  })

  test('shows "Show only vulnerable" toggle', () => {
    render(<DependencyGraph data={mockData} />)
    expect(screen.getByText('Show only vulnerable')).toBeInTheDocument()
  })

  test('displays severity legend', () => {
    render(<DependencyGraph data={mockData} />)
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('Safe')).toBeInTheDocument()
  })

  test('renders fallback message when no tree data', () => {
    render(<DependencyGraph data={{}} />)
    expect(screen.getByText('No dependency tree available.')).toBeInTheDocument()
  })

  test('renders vulnerable nodes with CVSS scores', () => {
    render(<DependencyGraph data={mockData} />)
    expect(screen.getByText('CVSS 9.8')).toBeInTheDocument()
  })
})
