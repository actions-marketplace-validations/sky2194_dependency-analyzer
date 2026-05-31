import { test, expect } from '@playwright/test'

test.describe('History page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/history')
  })

  test('history page loads', async ({ page }) => {
    await expect(page.locator('text=Scan History')).toBeVisible()
  })

  test('empty state shown when no history', async ({ page }) => {
    // Clear localStorage first
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('text=No scan history')).toBeVisible()
  })

  test('delete does not crash page', async ({ page }) => {
    // Run a scan first to have history
    await page.goto('/scan')
    await page.click('text=Load package.json example')
    await page.click('text=Scan & Detect Vulnerabilities')
    await page.waitForURL(/\/results/, { timeout: 30000 })
    await page.goto('/history')

    const deleteBtn = page.locator('text=×').first()
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click()
      // Confirm delete if dialog appears
      const confirmBtn = page.locator('text=Delete')
      if (await confirmBtn.isVisible()) await confirmBtn.click()
    }
    // Page must not crash
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
    await expect(page.locator('text=Scan History')).toBeVisible()
  })
})
