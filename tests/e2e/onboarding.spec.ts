import { expect, signedInAs, test } from './fixtures'

test.describe('first sign-in (user without a username)', () => {
  test.use(signedInAs('newbie'))

  test('any page sends the user to pick a username', async ({ page }) => {
    await page.goto('/rankings')

    await expect(page).toHaveURL(/\/onboarding$/)
    await expect(page.getByRole('heading', { name: 'Pick a username' })).toBeVisible()
  })

  test('an invalid username shows the format rule', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByLabel('Username').fill('a b')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('alert')).toContainText('3–24 characters')
  })

  test('a valid username opens the new public profile', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByLabel('Username').fill('Newcomer')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page).toHaveURL(/\/u\/newcomer$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Newcomer')

    await page.goto('/rankings')
    await expect(page).toHaveURL(/\/rankings$/)
  })
})

test.describe('first sign-in with a taken username', () => {
  test.use(signedInAs('newbie'))
  // The API answers 400 for a taken username; the browser logs that response as a console error.
  test.use({ allowedBrowserErrors: [/status of 400/] })

  test('is refused and stays on onboarding', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByLabel('Username').fill('alice')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(/\/onboarding$/)
  })
})
