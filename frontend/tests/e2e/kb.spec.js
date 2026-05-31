import { test, expect } from '@playwright/test'

test.describe('Knowledge Base', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/learn')
  })

  test('KB page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Knowledge Base' })).toBeVisible()
  })

  test('SCA section visible by default', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Software Composition Analysis' })).toBeVisible()
  })

  test('EPSS + KEV section accessible', async ({ page }) => {
    // Click the sidebar nav link (not the hidden select option)
    await page.locator('nav >> text=EPSS + KEV').click()
    await expect(page.locator('text=Exploit Prediction')).toBeVisible()
  })

  test('Risk Score section accessible', async ({ page }) => {
    await page.locator('nav >> text=Risk Score Explained').click()
    await expect(page.locator('text=logarithm')).toBeVisible()
  })

  test('Dependency Mediation section accessible', async ({ page }) => {
    await page.locator('nav >> text=Dependency Mediation').click()
    await expect(page.locator('text=Nearest depth')).toBeVisible()
  })

  test('mobile: select picker works', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile only')
    const select = page.locator('select')
    await expect(select).toBeVisible()
  })
})
