import { eq } from 'drizzle-orm'
import { user } from '#/db/schema'
import { ANIME_SLUG } from '../fixtures/catalog'
import { FIXTURE_USERS } from '../fixtures/users'
import { expect, signedInAs, test } from './fixtures'

const STARLIGHT_OP1 = `/anime/${ANIME_SLUG.starlight}/OP1`

test.describe('signed-in user rating themes', () => {
  test.use(signedInAs('alice'))

  test('quick-rates from the anime page', async ({ page }) => {
    await page.goto(`/anime/${ANIME_SLUG.kitchen}`)
    const opening = page.getByRole('listitem').filter({ hasText: 'Spice Spell' })
    await expect(opening.getByRole('button', { name: /Your score for Spice Spell: 7/ })).toBeVisible()

    // The ending has no credited song, so it goes by its slug.
    await page.getByRole('button', { name: 'Rate ED' }).click()
    await page.getByRole('button', { name: 'Score 6', exact: true }).click()

    await expect(page.getByRole('button', { name: /Your score for .*: 6/ })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: /Your score for .*: 6/ })).toBeVisible()
  })

  test('changing and clearing a score on the theme page updates the mean', async ({ page }) => {
    await page.goto(STARLIGHT_OP1)
    await expect(page.getByRole('button', { name: /Score 10/ })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Score 6', exact: true }).click()
    await expect(page.getByText('7.5', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: /Score 6 \(tap again to remove\)/ }).click()
    await expect(page.getByText('9.0', { exact: true })).toBeVisible()
    await expect(page.getByText('1 vote', { exact: true })).toBeVisible()
  })

  test('writes, edits and deletes a review', async ({ page }) => {
    await page.goto(STARLIGHT_OP1)
    await page.getByRole('textbox', { name: 'Your review' }).fill('Best OP of the season.')
    await page.getByRole('button', { name: 'Save review' }).click()

    await expect(page.getByRole('button', { name: 'Edit review' })).toBeVisible()
    await page.reload()
    await expect(page.getByText('Best OP of the season.')).toBeVisible()
    await page.getByRole('button', { name: 'Edit review' }).click()
    await page.getByRole('textbox', { name: 'Your review' }).fill('Best OP of the year.')
    await page.getByRole('button', { name: 'Save review' }).click()
    await expect(page.getByText('Best OP of the year.')).toBeVisible()

    await page.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByRole('textbox', { name: 'Your review' })).toHaveValue('')
  })

  test('adds a theme to the top 10 and reorders it on the profile', async ({ page }) => {
    await page.goto(`/anime/${ANIME_SLUG.kitchen}/OP`)
    await page.getByRole('button', { name: 'Add to top 10' }).click()
    await expect(page.getByRole('button', { name: '#4 in top 10' })).toBeVisible()

    await page.goto('/u/alice')
    const topTen = page.getByRole('list', { name: 'Top 10' })
    await expect(topTen.getByRole('listitem')).toHaveCount(4)
    await page.getByRole('button', { name: 'Move Spice Spell up' }).click()
    await expect(topTen.getByRole('listitem').nth(2)).toContainText('Spice Spell')
    await page.getByRole('button', { name: 'Remove Spice Spell from top 10' }).click()
    await expect(topTen.getByRole('listitem')).toHaveCount(3)
  })

  test('the profile lists the ratings, best first, with stats', async ({ page }) => {
    await page.goto('/u/alice')

    await expect(page.getByText('Never skips an OP.')).toBeVisible()
    const scores = page.getByRole('list', { name: 'Ratings' }).getByTestId('score')
    await expect(scores).toHaveText(['10', '9', '8', '7', '6'])
    await page.getByRole('link', { name: 'ED', exact: true }).click()
    await expect(scores).toHaveText(['8'])
  })
})

test.describe('social', () => {
  test.use(signedInAs('alice'))

  test("shows followed users' scores and follows/unfollows from the profile", async ({ page }) => {
    await page.goto(STARLIGHT_OP1)
    await expect(page.getByRole('region', { name: 'People you follow' })).toContainText('bob 9')

    await page.goto('/u/bob')
    await page.getByRole('button', { name: 'Following' }).click()
    await expect(page.getByRole('button', { name: 'Follow', exact: true })).toBeVisible()
    await expect(page.getByText('0 followers')).toBeVisible()
  })

  test('reports a review', async ({ page }) => {
    await page.goto(STARLIGHT_OP1)
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: "Report bob's review" }).click()

    await expect(page.getByText('Reported')).toBeVisible()
  })
})

test.describe('settings', () => {
  test.use(signedInAs('alice'))

  test('saves the bio and shows spoilers when asked', async ({ page }) => {
    await page.goto('/settings')
    await page.getByLabel('Bio').fill('OP enjoyer')
    await page.getByRole('button', { name: 'Save profile' }).click()
    await expect(page.getByRole('status')).toHaveText('Profile saved.')

    await page.getByText('Always show spoilers').click()
    await expect(page.getByRole('switch', { name: /Always show spoilers/ })).toBeChecked()

    await page.goto(`/anime/${ANIME_SLUG.iron}`)
    await expect(page.getByText('Petal Rain')).toBeVisible()
    await expect(page.getByText('Hidden spoiler theme')).toHaveCount(0)
    await page.goto('/u/alice')
    await expect(page.getByText('OP enjoyer')).toBeVisible()
  })

  test('switches to the light theme and remembers it', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Light', exact: true }).click()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })
})

test('signing out returns to the anonymous view', async ({ page, signInWithNewSession }) => {
  await signInWithNewSession('alice')
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Sign out' }).click()

  await expect(page.getByRole('link', { name: 'Sign in to start rating' })).toBeVisible()
})

test('deleting the account removes the user', async ({ page, signInWithNewSession, database }) => {
  await signInWithNewSession('leaver')
  await page.goto('/settings')
  await page.getByText('Delete account').click()
  await page.getByLabel('Type your username to confirm').fill('leaver')
  await page.getByRole('button', { name: 'Delete my account' }).click()

  await expect(page.getByRole('link', { name: 'Sign in to start rating' })).toBeVisible()
  const remaining = await database.$count(user, eq(user.id, FIXTURE_USERS.leaver.id))
  expect(remaining).toBe(0)
})
