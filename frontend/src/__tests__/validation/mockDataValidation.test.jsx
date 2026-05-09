import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('Mock Data Validation Tests', () => {
  test('Scanner.jsx should not use MOCKS in production code', () => {
    const scannerPath = resolve(__dirname, '../../pages/Scanner.jsx')
    const scannerContent = readFileSync(scannerPath, 'utf-8')
    
    // Check if MOCKS import is present and used (not commented)
    const hasActiveMockImport = scannerContent.includes("import { MOCKS } from '../data/mocks'")
    const hasCommentedMockImport = scannerContent.includes('// import { MOCKS }')
    
    if (hasActiveMockImport && !hasCommentedMockImport) {
      console.error('FAIL: Scanner.jsx has active MOCKS import')
      console.error('Line 6: import { MOCKS } from \'../data/mocks\'')
      console.error('This should be removed or only used for development')
    }
    
    // The current implementation has it commented out, which is good
    expect(hasCommentedMockImport).toBe(true)
  })

  test('Scanning.jsx fallback to mock data is a CRITICAL issue', () => {
    const scanningPath = resolve(__dirname, '../../pages/Scanning.jsx')
    const scanningContent = readFileSync(scanningPath, 'utf-8')
    
    // Check if mock data is used as fallback
    const hasMockFallback = scanningContent.includes('MOCKS[state.ecosystem]')
    
    if (hasMockFallback) {
      console.error('CRITICAL ISSUE FOUND: Scanning.jsx uses mock data as fallback')
      console.error('Line 43: result = { ...(MOCKS[state.ecosystem] || MOCKS.npm), is_mock: true }')
      console.error('This means when backend fails, users see fake data')
      console.error('FIX: Remove mock fallback and show proper error message')
    }
    
    // This test is expected to FAIL - indicating a critical bug
    // Mark as pending to document the issue
    expect(hasMockFallback).toBe(false)
  })

  test('Dashboard.jsx should not use mock data in production', () => {
    const dashboardPath = resolve(__dirname, '../../pages/Dashboard.jsx')
    const dashboardContent = readFileSync(dashboardPath, 'utf-8')
    
    const hasMockUsage = dashboardContent.includes('MOCKS')
    
    if (hasMockUsage) {
      console.error('FAIL: Dashboard.jsx uses MOCKS')
      console.error('Lines 142-144: mockResult = MOCKS[ecoKey] || MOCKS.npm')
      console.error('This should be removed for production')
    }
    
    expect(hasMockUsage).toBe(false)
  })

  test('Landing.jsx should not use mock data in production', () => {
    const landingPath = resolve(__dirname, '../../pages/Landing.jsx')
    const landingContent = readFileSync(landingPath, 'utf-8')
    
    const hasMockUsage = landingContent.includes('MOCKS')
    
    if (hasMockUsage) {
      console.error('FAIL: Landing.jsx uses MOCKS')
      console.error('Line 47: const sample = () => navigate(\'/results\', { state: { result: { ...MOCKS.npm, is_mock: true } } })')
      console.error('This should be removed or clearly marked as demo-only')
    }
    
    expect(hasMockUsage).toBe(false)
  })

  test('Results.jsx shows mock data warning (good practice)', () => {
    const resultsPath = resolve(__dirname, '../../pages/Results.jsx')
    const resultsContent = readFileSync(resultsPath, 'utf-8')
    
    // It's good that Results.jsx shows a warning when mock data is present
    const hasMockWarning = resultsContent.includes('result._isMock') && 
                          resultsContent.includes('Demo data shown')
    
    if (hasMockWarning) {
      console.log('PASS: Results.jsx properly warns about mock data')
    }
    
    expect(hasMockWarning).toBe(true)
  })

  test('Analytics.jsx shows mock data warning (good practice)', () => {
    const analyticsPath = resolve(__dirname, '../../pages/Analytics.jsx')
    const analyticsContent = readFileSync(analyticsPath, 'utf-8')
    
    // It's good that Analytics.jsx shows a warning when mock data is present
    const hasMockWarning = analyticsContent.includes('result.is_mock') && 
                          analyticsContent.includes('DEMO DATA')
    
    if (hasMockWarning) {
      console.log('PASS: Analytics.jsx properly warns about mock data')
    }
    
    expect(hasMockWarning).toBe(true)
  })
})
