import { ANIME_SLUG } from '../fixtures/catalog'
import { expect, signedInAs, test } from './fixtures'

// Layout guards that hold on every viewport (desktop and mobile projects). The first one this
// caught: the header and theme rows overflowing a phone screen.
const PAGES = [
  '/',
  '/rankings',
  '/search?q=ro',
  `/anime/${ANIME_SLUG.starlight}`,
  `/anime/${ANIME_SLUG.starlight}/OP1`,
  '/artist/mika_sato',
  '/u/alice',
  '/settings',
]

async function horizontalOverflow(page: import('@playwright/test').Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

test.describe('no horizontal scrolling', () => {
  test.use(signedInAs('alice'))

  for (const path of PAGES) {
    test(`${path} fits the viewport width`, async ({ page }) => {
      await page.goto(path)
      expect(await horizontalOverflow(page)).toBe(0)
    })
  }
})

test.describe('theme rows', () => {
  test.use(signedInAs('alice'))

  test('song titles are not truncated on the anime page', async ({ page }) => {
    await page.goto(`/anime/${ANIME_SLUG.starlight}`)

    const songTitle = page.getByText('Run to the Stars', { exact: true })
    const isTruncated = await songTitle.evaluate((element) => element.scrollWidth > element.clientWidth)
    expect(isTruncated).toBe(false)
  })
})
