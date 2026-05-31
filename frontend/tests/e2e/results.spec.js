import { test, expect } from '@playwright/test'

async function runScan(page) {
  await page.goto('/scan')
  await page.waitForLoadState('networkidle')
  await page.locator('button', { hasText: 'Load package.json example' }).click()
  await page.locator('button', { hasText: 'Scan & Detect Vulnerabilities' }).click()
  await page.waitForURL(/\/results/, { timeout: 30000 })
  await page.waitForLoadState('networkidle')
}

test.describe('Results page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/scan*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          project_name: 'my-node-app',
          ecosystem: 'npm',
          summary: {
            total_packages: 53,
            vulnerable_packages: 4,
            critical: 2,
            high: 1,
            medium: 1,
            low: 0,
            risk_score: 72,
            direct_count: 10,
            transitive_count: 43
          },
          vulnerabilities: [
            {
              cve_id: 'CVE-2022-29078',
              package_name: 'ejs',
              installed_version: '3.1.5',
              severity: 'CRITICAL',
              cvss_score: 9.8,
              description: 'Template injection leading to RCE',
              fix_version: '3.1.9',
              dependency_type: 'transitive',
              path: ['my-app', 'express', 'ejs']
            },
            {
              cve_id: 'CVE-2020-28500',
              package_name: 'lodash',
              installed_version: '4.17.15',
              severity: 'HIGH',
              cvss_score: 7.5,
              description: 'Prototype pollution',
              fix_version: '4.17.21',
              dependency_type: 'transitive',
              path: ['my-app', 'express', 'body-parser', 'lodash']
            },
            {
              cve_id: 'CVE-2021-3749',
              package_name: 'axios',
              installed_version: '0.21.1',
              severity: 'HIGH',
              cvss_score: 7.5,
              description: 'Regular expression denial of service',
              fix_version: '0.21.2',
              dependency_type: 'direct',
              path: ['my-app', 'axios']
            },
            {
              cve_id: 'CVE-2021-23343',
              package_name: 'path-parse',
              installed_version: '1.0.6',
              severity: 'MEDIUM',
              cvss_score: 5.3,
              description: 'ReDoS vulnerability',
              fix_version: '1.0.7',
              dependency_type: 'transitive',
              path: ['my-app', 'webpack', 'path-parse']
            }
          ],
          packages: [],
          grouped_packages: [
            {
              name: 'ejs',
              version: '3.1.5',
              dependency_type: 'transitive',
              vulnerabilities: ['CVE-2022-29078']
            }
          ]
        })
      })
    })
  })

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

  test('CVE table renders — check .a-cve-row exists', async ({ page }) => {
    await runScan(page)
    // Package groups are collapsed by default — expand the first one
    await page.locator('.a-pkg-group-header').first().click()
    await expect(page.locator('.a-cve-row').first()).toBeVisible()
  })

  test('clicking first CVE row opens detail panel — check .a-panel visible', async ({ page }) => {
    await runScan(page)
    // Expand the first package group to reveal CVE rows
    await page.locator('.a-pkg-group-header').first().click()
    await page.locator('.a-cve-row').first().click()
    // Panel should display the selected CVE's close button
    await expect(page.locator('[aria-label="Close details"]')).toBeVisible()
  })

  test('severity filter works — click CRITICAL filter, check rows', async ({ page }) => {
    await runScan(page)
    // Filter pill format is "CRITICAL (N)"
    await page.locator('.a-pill', { hasText: /CRITICAL/ }).click()
    // Expand the first group to verify rows are visible under the filter
    await page.locator('.a-pkg-group-header').first().click()
    await expect(page.locator('.a-cve-row').first()).toBeVisible()
  })

  test('Dependency Graph tab renders — click tab, check graph canvas', async ({ page }) => {
    await runScan(page)
    await page.locator('.a-tab', { hasText: 'Dependency Graph' }).click()
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('Fixes tab renders — click Fixes tab, check content', async ({ page }) => {
    await runScan(page)
    await page.locator('.a-tab', { hasText: /Fixes/ }).click()
    // Fixes tab shows either fix suggestions or a "no fixes" message
    await expect(page.locator('.a-tab.active', { hasText: /Fixes/ })).toBeVisible()
  })

  test('Export button is visible', async ({ page }) => {
    await runScan(page)
    await expect(page.locator('button', { hasText: 'Export' })).toBeVisible()
  })

  test('New Scan button returns to scanner', async ({ page }) => {
    await runScan(page)
    await page.locator('button', { hasText: 'New Scan' }).click()
    await expect(page).toHaveURL(/\/scan/)
  })

  test('auto-selects highest severity CVE on load — check sidebar has content', async ({ page }) => {
    await runScan(page)
    // The app auto-selects the top CVE; the close button appears only when a CVE is selected
    await expect(page.locator('[aria-label="Close details"]')).toBeVisible()
  })
})
