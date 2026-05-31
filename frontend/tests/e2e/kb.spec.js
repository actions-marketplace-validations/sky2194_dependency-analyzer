import { test, expect } from '@playwright/test'

test.describe('Knowledge Base', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/learn')
    await page.waitForLoadState('networkidle')
  })

  test('KB page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Knowledge Base/i })).toBeVisible()
  })

  test('SCA section visible by default', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Software Composition Analysis/i })).toBeVisible()
  })

  test('EPSS + KEV section accessible', async ({ page }) => {
    // Click sidebar button — not the hidden select option
    await page.locator('button:has-text("EPSS")').first().click()
    await expect(page.getByRole('heading', { name: /EPSS/i })).toBeVisible()
  })

  test('Risk Score section accessible', async ({ page }) => {
    await page.locator('button:has-text("Risk Score")').first().click()
    await expect(page.getByRole('heading', { name: /Risk Score/i })).toBeVisible()
  })

  test('Dependency Mediation section accessible', async ({ page }) => {
    await page.locator('button:has-text("Dependency Mediation")').first().click()
    await expect(page.getByRole('heading', { name: /Mediation/i })).toBeVisible()
  })
})
