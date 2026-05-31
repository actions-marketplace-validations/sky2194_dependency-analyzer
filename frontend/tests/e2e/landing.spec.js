import { test, expect } from '@playwright/test'

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('hero title is visible', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('dependencies')
  })

  test('primary CTA navigates to scanner', async ({ page }) => {
    await page.click('text=Scan Free')
    await expect(page).toHaveURL(/\/scan/)
  })

  test('"Learn the concepts" navigates to KB', async ({ page }) => {
    await page.click('text=Learn the concepts')
    await expect(page).toHaveURL(/\/learn/)
  })

  test('nav Features link scrolls to section', async ({ page }) => {
    await page.click('text=Features')
    await expect(page.locator('#features')).toBeVisible()
  })

  test('nav How it works scrolls to section', async ({ page }) => {
    await page.click('text=How it works')
    await expect(page.locator('#how-it-works')).toBeVisible()
  })

  test('GitHub link present and correct', async ({ page }) => {
    const link = page.locator('a[href*="github.com/sky2194"]').first()
    await expect(link).toBeVisible()
  })

  test('footer NVD link present', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const link = page.locator('text=NVD').first()
    await expect(link).toBeVisible()
  })

  test('footer OSV link present', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const link = page.locator('text=OSV').first()
    await expect(link).toBeVisible()
  })

  test('CTA band scan button works', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.click('text=Start Scanning Free')
    await expect(page).toHaveURL(/\/scan/)
  })

  test('mobile: hamburger opens menu', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile only')
    await page.click('[aria-label="Open menu"]')
    await expect(page.locator('.lp-mobile-menu')).toBeVisible()
  })

  test('mobile: hamburger menu scan button works', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile only')
    await page.click('[aria-label="Open menu"]')
    await page.click('text=Start Scanning')
    await expect(page).toHaveURL(/\/scan/)
  })
})
