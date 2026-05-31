import { test, expect } from '@playwright/test'

async function runScan(page) {
  await page.goto('/scan')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /Load package.json example/i }).click()
  await page.getByRole('button', { name: /Scan.*Vulnerabilities/i }).click()
  await page.waitForURL(/\/results/, { timeout: 60000 })
  await page.waitForLoadState('networkidle')
}

test.describe('Results page', () => {
  test('results page loads after scan', async ({ page }) => {
    await runScan(page)
    await expect(page.locator('text=Security Report')).toBeVisible()
  })

  test('no crash on results load', async ({ page }) => {
    await runScan(page)
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  })

  test('New Scan navigates back to scanner', async ({ page }) => {
    await runScan(page)
    await page.getByRole('button', { name: /New Scan/i }).click()
    await expect(page).toHaveURL(/\/scan/)
  })
})
