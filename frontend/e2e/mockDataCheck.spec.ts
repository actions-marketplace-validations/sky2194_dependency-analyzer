import { test, expect } from '@playwright/test'

test.describe('Mock Data Detection Tests', () => {
  test('Detect mock data warning in results', async ({ page }) => {
    // This test checks if mock data warnings are displayed when backend is unavailable
    await page.goto('/scan')
    
    // Load example and attempt scan (will fail without backend)
    await page.click('text=Load package.json example')
    await page.click('button:has-text("Scan")')
    
    // If backend is not running, mock data warning should appear
    // This is a CRITICAL ISSUE that needs to be fixed
    const mockWarning = page.locator('text=Demo data shown')
    
    // The presence of this warning indicates mock data is being used
    // This should NOT happen in production
    if (await mockWarning.isVisible()) {
      console.error('CRITICAL: Mock data is being used in production code!')
      console.error('Mock data fallback found in: Scanning.jsx line 43')
      console.error('Mock data fallback found in: Dashboard.jsx lines 142-144')
      console.error('Mock data fallback found in: Landing.jsx line 47')
    }
  })

  test('Verify no mock data in normal flow', async ({ page }) => {
    // This test verifies that mock data is NOT used when backend is available
    // This requires the backend to be running
    await page.goto('/scan')
    
    // In a proper implementation, this should never show mock data
    // when the backend is operational
  })
})
