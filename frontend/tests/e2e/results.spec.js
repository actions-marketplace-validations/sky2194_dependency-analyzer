import { test, expect } from '@playwright/test'

// Runs a real scan against the production API
// VITE_API_URL must be set in CI secrets
async function runScan(page) {
  await page.goto('/scan')
  await page.waitForLoadState('networkidle')
  // Load the example package.json
  await page.locator('button', { hasText: 'Load package.json example' }).click()
  // Textarea should now have content
  await expect(page.locator('textarea')).not.toBeEmpty()
  // Click scan
  await page.locator('button', { hasText: 'Scan & Detect Vulnerabilities' }).click()
  // Wait for results page — real API may take up to 60s
  await page.waitForURL(/\/results/, { timeout: 60000 })
  await page.waitForLoadState('networkidle')
}

test.describe('Results page', () => {
  test('scan completes and shows Security Report', async ({ page }) => {
    await runScan(page)
    await expect(page.locator('text=Security Report')).toBeVisible()
  })

  test('no crash — error boundary not shown', async ({ page }) => {
    await runScan(page)
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  })

  test('risk score section is visible', async ({ page }) => {
    await runScan(page)
    await expect(page.locator('text=RISK SCORE')).toBeVisible()
  })

  test('New Scan button returns to scanner', async ({ page }) => {
    await runScan(page)
    await page.locator('button', { hasText: 'New Scan' }).click()
    await expect(page).toHaveURL(/\/scan/)
  })
})
