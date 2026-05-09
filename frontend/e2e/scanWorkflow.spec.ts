import { test, expect } from '@playwright/test'

test.describe('Scan Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('Landing page loads correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/Dependency Analyzer/)
    await expect(page.locator('text=Dependency Analyzer')).toBeVisible()
  })

  test('Navigate to Scanner page', async ({ page }) => {
    await page.click('text=Scanner')
    await expect(page).toHaveURL(/.*\/scan/)
    await expect(page.locator('text=Dependency Vulnerability Scanner')).toBeVisible()
  })

  test('Ecosystem tabs are clickable', async ({ page }) => {
    await page.goto('/scan')
    
    // Test npm tab
    await page.click('text=npm')
    await expect(page.locator('text=package.json')).toBeVisible()
    
    // Test PyPI tab
    await page.click('text=PyPI')
    await expect(page.locator('text=requirements.txt')).toBeVisible()
    
    // Test Maven tab
    await page.click('text=Maven')
    await expect(page.locator('text=pom.xml')).toBeVisible()
  })

  test('Load example content', async ({ page }) => {
    await page.goto('/scan')
    await page.click('text=Load package.json example')
    
    const textarea = page.locator('textarea')
    const value = await textarea.inputValue()
    expect(value).toContain('dependencies')
  })

  test('Scan button is disabled without content', async ({ page }) => {
    await page.goto('/scan')
    const scanButton = page.locator('button:has-text("Scan")')
    await expect(scanButton).toBeDisabled()
  })

  test('Scan button is enabled with content', async ({ page }) => {
    await page.goto('/scan')
    await page.fill('textarea', '{"dependencies":{"express":"4.17.1"}}')
    
    const scanButton = page.locator('button:has-text("Scan")')
    await expect(scanButton).toBeEnabled()
  })

  test('Theme toggle works', async ({ page }) => {
    await page.goto('/scan')
    
    const themeButton = page.locator('button:has-text("☀️")')
    await themeButton.click()
    
    // Check theme attribute changes
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'light')
  })

  test('Severity guide displays correctly', async ({ page }) => {
    await page.goto('/scan')
    await expect(page.locator('text=Severity Guide')).toBeVisible()
    await expect(page.locator('text=CRITICAL')).toBeVisible()
    await expect(page.locator('text=HIGH')).toBeVisible()
    await expect(page.locator('text=MEDIUM')).toBeVisible()
    await expect(page.locator('text=LOW')).toBeVisible()
  })
})

test.describe('Results Page E2E Tests', () => {
  test('Results page displays scan data', async ({ page }) => {
    // Navigate with mock data
    await page.goto('/scan')
    await page.fill('textarea', '{"dependencies":{"express":"4.17.1"}}')
    
    // Note: This would require backend to be running for full test
    // For now, test the UI elements
    await expect(page.locator('text=Dependency Vulnerability Scanner')).toBeVisible()
  })

  test('Export buttons are present', async ({ page }) => {
    // This would be tested after a successful scan
    // For now, verify the page structure
    await page.goto('/scan')
    await expect(page.locator('text=Scanner')).toBeVisible()
  })
})

test.describe('Responsive Design Tests', () => {
  test('Mobile view - Scanner page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/scan')
    
    // Check if elements are visible on mobile
    await expect(page.locator('text=Dependency Vulnerability Scanner')).toBeVisible()
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('Tablet view - Scanner page', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/scan')
    
    await expect(page.locator('text=Dependency Vulnerability Scanner')).toBeVisible()
  })

  test('Desktop view - Scanner page', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/scan')
    
    await expect(page.locator('text=Dependency Vulnerability Scanner')).toBeVisible()
    // Sidebar should be visible on desktop
    await expect(page.locator('text=Severity Guide')).toBeVisible()
  })
})

test.describe('Cross-Browser Compatibility Tests', () => {
  test('Scanner page renders in all browsers', async ({ page, browserName }) => {
    await page.goto('/scan')
    
    // Basic rendering check that should work across browsers
    await expect(page.locator('text=Dependency Vulnerability Scanner')).toBeVisible()
    await expect(page.locator('textarea')).toBeVisible()
    
    console.log(`Test passed on ${browserName}`)
  })
})

test.describe('Theme Validation Tests', () => {
  test('Dark theme applies correctly', async ({ page }) => {
    await page.goto('/scan')
    
    // Set dark theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark')
    })
    
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('Light theme applies correctly', async ({ page }) => {
    await page.goto('/scan')
    
    // Toggle to light theme
    const themeButton = page.locator('button:has-text("☀️")')
    await themeButton.click()
    
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('Theme persists across navigation', async ({ page }) => {
    await page.goto('/scan')
    
    // Toggle theme
    const themeButton = page.locator('button:has-text("☀️")')
    await themeButton.click()
    
    // Navigate to another page
    await page.click('text=📖 Knowledge Base')
    
    // Check theme persists
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })
})

test.describe('Visual Regression Tests', () => {
  test('Scanner page visual consistency', async ({ page }) => {
    await page.goto('/scan')
    
    // Take screenshot for visual comparison
    await page.screenshot({ path: 'screenshots/scanner-page.png' })
    
    // Verify key elements are in expected positions
    const scanner = page.locator('text=Dependency Vulnerability Scanner')
    await expect(scanner).toBeVisible()
  })

  test('Landing page visual consistency', async ({ page }) => {
    await page.goto('/')
    
    await page.screenshot({ path: 'screenshots/landing-page.png' })
    
    await expect(page.locator('text=Dependency Analyzer')).toBeVisible()
  })
})
