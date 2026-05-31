import { test, expect } from '@playwright/test'

test.describe('Scanner page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/scan')
  })

  test('scanner page loads', async ({ page }) => {
    await expect(page.locator('text=Dependency Vulnerability Scanner')).toBeVisible()
  })

  test('npm tab is selected by default', async ({ page }) => {
    await expect(page.locator('text=package.json')).toBeVisible()
  })

  test('PyPI tab switches ecosystem', async ({ page }) => {
    await page.click('text=PyPI')
    await expect(page.locator('text=requirements.txt')).toBeVisible()
  })

  test('Maven tab switches ecosystem', async ({ page }) => {
    await page.click('text=Maven')
    await expect(page.locator('text=pom.xml')).toBeVisible()
  })

  test('Load example button populates textarea', async ({ page }) => {
    await page.click('text=Load package.json example')
    const textarea = page.locator('textarea')
    await expect(textarea).not.toBeEmpty()
  })

  test('upload drop zone is keyboard accessible', async ({ page }) => {
    const dropzone = page.locator('[role="button"][aria-label*="Upload"]')
    await expect(dropzone).toHaveAttribute('tabindex', '0')
  })

  test('paste auto-detects npm ecosystem', async ({ page }) => {
    const textarea = page.locator('textarea')
    await textarea.fill('{"dependencies": {"express": "4.17.1"}}')
    await expect(page.locator('text=JavaScript')).toBeVisible()
  })

  test('paste auto-detects PyPI ecosystem', async ({ page }) => {
    await page.click('text=PyPI')
    const textarea = page.locator('textarea')
    await textarea.fill('requests==2.28.0\nflask==2.0.1')
    await expect(page.locator('text=Python')).toBeVisible()
  })

  test('severity guide is visible', async ({ page }) => {
    await expect(page.locator('text=SEVERITY GUIDE')).toBeVisible()
    await expect(page.locator('text=CRITICAL')).toBeVisible()
  })

  test('trust microcopy is visible', async ({ page }) => {
    await expect(page.locator('text=never stored')).toBeVisible()
  })

  test('scan button is present', async ({ page }) => {
    await expect(page.locator('text=Scan & Detect Vulnerabilities')).toBeVisible()
  })
})
