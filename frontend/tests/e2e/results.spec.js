import { test, expect } from '@playwright/test'

// Helper — run a scan and land on results
async function runScan(page) {
  await page.goto('/scan')
  await page.click('text=Load package.json example')
  await page.click('text=Scan & Detect Vulnerabilities')
  await page.waitForURL(/\/results/, { timeout: 30000 })
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

  test('CVE table renders', async ({ page }) => {
    await runScan(page)
    await page.click('text=All Packages')
    await expect(page.locator('.a-cve-row').first()).toBeVisible()
  })

  test('clicking CVE row opens detail panel', async ({ page }) => {
    await runScan(page)
    await page.click('.a-cve-row >> nth=0')
    await expect(page.locator('.a-panel')).toBeVisible()
  })

  test('detail panel close button works', async ({ page }) => {
    await runScan(page)
    await page.click('.a-cve-row >> nth=0')
    await page.click('[aria-label="Close details"]')
  })

  test('severity filter works', async ({ page }) => {
    await runScan(page)
    await page.click('text=CRITICAL')
    const rows = page.locator('.a-cve-row')
    const count = await rows.count()
    // After filter, only critical rows should show
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText('CRITICAL')
    }
  })

  test('Dependency Graph tab renders', async ({ page }) => {
    await runScan(page)
    await page.click('text=Dependency Graph')
    await expect(page.locator('.graph-canvas')).toBeVisible()
  })

  test('Fixes tab renders', async ({ page }) => {
    await runScan(page)
    await page.click('text=Fixes')
    await expect(page.locator('text=Fix All')).toBeVisible()
  })

  test('Export CSV button present', async ({ page }) => {
    await runScan(page)
    await expect(page.locator('text=Export')).toBeVisible()
  })

  test('New Scan button navigates back', async ({ page }) => {
    await runScan(page)
    await page.click('text=New Scan')
    await expect(page).toHaveURL(/\/scan/)
  })

  test('no crash on load — error boundary not triggered', async ({ page }) => {
    await runScan(page)
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  })
})
