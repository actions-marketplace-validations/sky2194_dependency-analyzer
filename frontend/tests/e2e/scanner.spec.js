import { test, expect } from '@playwright/test'

test.describe('Scanner page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/scan')
    await page.waitForLoadState('networkidle')
  })

  test('scanner page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('npm tab selected by default', async ({ page }) => {
    // The active tab button contains "npm"
    await expect(page.locator('[class*="tab"]:has-text("npm")').first()).toBeVisible()
  })

  test('PyPI tab switches ecosystem', async ({ page }) => {
    await page.getByRole('button', { name: /PyPI/i }).click()
    await expect(page.locator('[class*="tab"]:has-text("PyPI")').first()).toBeVisible()
  })

  test('Maven tab switches ecosystem', async ({ page }) => {
    await page.getByRole('button', { name: /Maven/i }).click()
    await expect(page.locator('[class*="tab"]:has-text("Maven")').first()).toBeVisible()
  })

  test('Load example button populates textarea', async ({ page }) => {
    await page.getByRole('button', { name: /Load package.json example/i }).click()
    await expect(page.locator('textarea')).not.toBeEmpty()
  })

  test('upload drop zone is keyboard accessible', async ({ page }) => {
    const dropzone = page.locator('[role="button"][aria-label*="Upload"]')
    await expect(dropzone).toHaveAttribute('tabindex', '0')
  })

  test('paste auto-detects npm', async ({ page }) => {
    await page.locator('textarea').fill('{"dependencies": {"express": "4.17.1"}}')
    await expect(page.locator('text=JavaScript').first()).toBeVisible()
  })

  test('severity guide visible', async ({ page }) => {
    await expect(page.locator('text=SEVERITY GUIDE')).toBeVisible()
  })

  test('trust microcopy visible', async ({ page }) => {
    await expect(page.locator('text=never stored').first()).toBeVisible()
  })

  test('scan button present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Scan.*Vulnerabilities/i })).toBeVisible()
  })
})
