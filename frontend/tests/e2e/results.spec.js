import { test, expect } from '@playwright/test'

// Results tests hit the real backend at production URL
// These run against the live API — skip if no API URL set
const API_URL = process.env.VITE_API_URL || 'https://api.depanalyzer.com'

async function runScan(page) {
  await page.goto('/scan')
  await page.click('text=Load package.json example')
  // Set the API URL via page context
  await page.click('text=Scan & Detect Vulnerabilities')
  await page.waitForURL(/\/results/, { timeout: 60000 })
}

test.describe('Results page', () => {
  test('results page loads after scan', async ({ page }) => {
    await runScan(page)
    await expect(page.locator('text=Security Report')).toBeVisible()
  })

  test('risk score is visible', async ({ page }) => {
    await runScan(page)
    await expect(page.locator('text=RISK SCORE')).toBeVisible()
  })

  test('no crash on load', async ({ page }) => {
    await runScan(page)
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  })

  test('New Scan button navigates back', async ({ page }) => {
    await runScan(page)
    await page.click('text=New Scan')
    await expect(page).toHaveURL(/\/scan/)
  })
})
