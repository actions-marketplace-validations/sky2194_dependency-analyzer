import { test, expect } from '@playwright/test'

test.describe('History page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/history')
    await page.waitForLoadState('networkidle')
  })

  test('history page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Scan History' })).toBeVisible()
  })

  test('empty state shown when no history', async ({ page }) => {
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=No scan history yet')).toBeVisible()
  })

  test('delete does not crash page', async ({ page }) => {
    // Inject fake scan
    await page.evaluate(() => {
      localStorage.setItem('depanalyzer_projects', JSON.stringify([{
        name: 'test-app',
        scans: [{
          id: 'test-123',
          project_name: 'test-app',
          scanned_at: new Date().toISOString(),
          summary: { total_packages: 5, critical: 1, high: 0, medium: 0, low: 0, risk_score: 45 },
          vulnerabilities: []
        }]
      }]))
    })
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Try to find and click delete
    const deleteBtn = page.locator('button:has-text("×"), button[aria-label*="delete" i], button[aria-label*="Delete" i]').first()
    if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteBtn.click()
      const confirm = page.locator('button:has-text("Delete")').first()
      if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirm.click()
      }
    }

    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: 'Scan History' })).toBeVisible()
  })
})
