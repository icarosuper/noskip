import { ANIME_SLUG } from '../fixtures/catalog'
import { expect, test } from './fixtures'

test.describe('anonymous visitor', () => {
  test('home shows the current season and the all-time top', async ({ page }) => {
    await page.goto('/')

    await expect(
      page.getByRole('list', { name: 'All-time ranking' }).getByRole('listitem').first(),
    ).toBeVisible()
    await expect(
      page.getByRole('list', { name: /^(Winter|Spring|Summer|Fall) \d{4} ranking$/ }),
    ).toContainText('Run to the Stars')
    await expect(
      page.getByRole('heading', { name: 'The best anime openings and endings, ranked by fans.' }),
    ).toBeVisible()
  })

  test('the ranking filters by year, season and theme type', async ({ page }) => {
    await page.goto('/rankings')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('All-time')
    await expect(page.getByLabel('Season')).toBeDisabled()

    await page.getByRole('link', { name: 'ED', exact: true }).click()
    await expect(page).toHaveURL(/type=ED/)
    const ranking = page.getByRole('list', { name: 'Ranking' })
    await expect(ranking).toContainText('Quiet Orbit')
    await expect(ranking).not.toContainText('Run to the Stars')

    await page.getByLabel('Year').selectOption('2024')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('2024')
    await page.getByLabel('Season').selectOption('SUMMER')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Summer 2024')
    await expect(ranking).toContainText('Rust and Roses')

    await page.getByLabel('Year').selectOption('')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('All-time')
  })

  test('the list/grid choice is remembered per screen', async ({ page }) => {
    await page.goto('/rankings')
    await page.getByRole('button', { name: 'List view' }).click()
    await page.getByRole('button', { name: 'Grid view' }).click()
    await expect(page.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'true')

    await page.reload()
    await expect(page.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'true')
    const ranking = page.getByRole('list', { name: 'Ranking' })
    await expect(ranking).toHaveCSS('display', 'grid')

    // Another screen keeps its own choice (none saved: list on phones, grid on desktop).
    await page.getByRole('button', { name: 'List view' }).click()
    await expect(ranking).not.toHaveCSS('display', 'grid')
    await page.goto('/artist/mika_sato')
    const isDesktop = (page.viewportSize()?.width ?? 0) >= 1024
    await expect(page.getByRole('button', { name: isDesktop ? 'Grid view' : 'List view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('the season page lists its anime and links to its ranking', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /^Browse .* anime$/ }).click()

    await expect(page).toHaveURL(/\/season\//)
    await expect(page.getByRole('link', { name: /^Starlight Relay/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /^Kitchen Witch Diaries/ })).toBeVisible()
    await page.getByRole('link', { name: "See this season's ranking" }).click()
    await expect(page).toHaveURL(/season=/)
  })

  test('search finds anime, songs and artists', async ({ page }) => {
    await page.goto('/search')
    await page.getByRole('searchbox').fill('hanabira')
    await page.getByRole('searchbox').press('Enter')

    await expect(page).toHaveURL(/q=hanabira/)
    const animeResults = page.getByRole('list', { name: 'Anime results' })
    await expect(animeResults.getByRole('link', { name: /Iron Petals/ })).toBeVisible()
    await expect(animeResults.getByRole('link', { name: /Tetsu no Hanabira Gekijouban/ })).toBeVisible()

    await page.goto('/search?q=mika')
    await page
      .getByRole('list', { name: 'Artist results' })
      .getByRole('link', { name: /Mika Sato/ })
      .click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mika Sato')
    await expect(page.getByRole('list', { name: 'Themes by Mika Sato' })).toContainText('Quiet Orbit')
  })

  test('anime page lists openings and endings and asks to sign in to rate', async ({ page }) => {
    await page.goto(`/anime/${ANIME_SLUG.starlight}`)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Starlight Relay')
    await expect(page.getByRole('heading', { name: 'Openings' })).toBeVisible()
    await expect(page.getByText('Launch Day')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Rate / })).toHaveCount(0)
    await expect(page.getByText('to rate these themes.')).toBeVisible()
  })

  test('theme page shows the score, the watch link and reviews', async ({ page }) => {
    await page.goto(`/anime/${ANIME_SLUG.starlight}`)
    await page.getByRole('link', { name: /Run to the Stars/ }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Run to the Stars')
    await expect(page.getByRole('link', { name: /Watch on AnimeThemes/ })).toHaveAttribute(
      'href',
      `https://animethemes.moe/anime/${ANIME_SLUG.starlight}/OP1`,
    )
    await expect(page.getByText('2 votes')).toBeVisible()
    await expect(page.getByText('Goosebumps every week.')).toBeVisible()
  })

  test('spoiler themes are blurred until revealed', async ({ page }) => {
    await page.goto(`/anime/${ANIME_SLUG.iron}`)

    await expect(page.getByText('Hidden spoiler theme')).toBeAttached()
    await page.getByRole('button', { name: 'Show spoiler theme' }).click()
    await expect(page.getByText('Hidden spoiler theme')).toHaveCount(0)
  })

  test('a private profile shows nothing but its name', async ({ page }) => {
    await page.goto('/u/carol')

    await expect(page.getByText('This profile is private.')).toBeVisible()
    await expect(page.getByRole('list', { name: 'Ratings' })).toHaveCount(0)
  })

  test('a protected page sends the visitor to sign in', async ({ page }) => {
    await page.goto('/onboarding')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('button', { name: 'Continue with Discord' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  })
})

test.describe('not found', () => {
  // The browser logs the 404 response of the document itself as a console error; that one is expected.
  test.use({ allowedBrowserErrors: [/status of 404/] })

  test('unknown anime, themes, artists and seasons show not found', async ({ page }) => {
    for (const path of [
      '/anime/does_not_exist',
      `/anime/${ANIME_SLUG.starlight}/IN1`,
      '/artist/nobody',
      '/season/2025/monsoon',
    ]) {
      await page.goto(path)
      await expect(page.getByText('Page not found.')).toBeVisible()
    }
  })
})
