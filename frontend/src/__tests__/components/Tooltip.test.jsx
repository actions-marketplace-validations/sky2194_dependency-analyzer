import { render, screen } from '@testing-library/react'
import Tooltip from '../../components/Tooltip'

describe('Tooltip Component', () => {
  beforeEach(() => {
    // Mock terms data
    jest.mock('../../data/terms', () => ({
      terms: {
        sca: 'Software Composition Analysis',
        cve: 'Common Vulnerabilities and Exposures',
        dependency: 'A package that your project relies on',
      },
    }))
  })

  test('renders tooltip with term key', () => {
    render(<Tooltip termKey="sca" />)
    const tooltip = screen.getByText('SCA')
    expect(tooltip).toBeInTheDocument()
  })

  test('renders custom text when provided', () => {
    render(<Tooltip termKey="sca" text="Custom Text" />)
    const customText = screen.getByText('Custom Text')
    expect(customText).toBeInTheDocument()
  })
})
