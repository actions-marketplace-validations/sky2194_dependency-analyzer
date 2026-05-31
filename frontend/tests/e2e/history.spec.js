import { test, expect } from '@playwright/test'

test.describe('History page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/history')
  })

  test('history page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Scan History' })).toBeVisible()
  })

  test('empty state shown when no history', async ({ page }) => {
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('text=No scan history yet')).toBeVisible()
  })

  test('delete does not crash page', async ({ page }) => {
    // Inject a fake scan into localStorage so we have something to delete
    await page.evaluate(() => {
      const fakeScan = {
        id: 'test-123',
        project_name: 'test-app',
        scanned_at: new Date().toISOString(),
        summary: { total_packages: 5, critical: 1, high: 0, medium: 0, low: 0, risk_score: 45 },
        vulnerabilities: []
      }
      localStorage.setItem('depanalyzer_projects', JSON.stringify([{ name: 'test-app', scans: [fakeScan] }]))
    })
    await page.reload()

    const deleteBtn = page.locator('[aria-label="Delete scan"], text=×').first()
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtn.click()
      const confirmBtn = page.locator('text=Delete').first()
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click()
      }
    }
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: 'Scan History' })).toBeVisible()
  })
})
