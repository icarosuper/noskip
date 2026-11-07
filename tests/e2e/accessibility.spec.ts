import AxeBuilder from '@axe-core/playwright'
import { ANIME_SLUG } from '../fixtures/catalog'
import { expect, signedInAs, test } from './fixtures'

// axe-core scan of every page. Fails on serious/critical violations (contrast, missing labels,
// invalid ARIA…). The violation list in the failure message says what and where.
const PUBLIC_PAGES = [
  '/',
  '/season/2024/spring',
  '/search?q=ro',
  `/anime/${ANIME_SLUG.iron}`,
  `/anime/${ANIME_SLUG.starlight}/OP1`,
  '/artist/mika_sato',
  '/u/alice',
  '/u/carol',
  '/u/alice/following',
  '/login',
]

async function seriousViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page }).analyze()
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => ({
      rule: violation.id,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target.join(' ')),
    }))
}

// Both themes: the palette is defined per color scheme in src/styles.css.
const COLOR_SCHEMES = ['light', 'dark'] as const

test.describe('accessibility — anonymous', () => {
  for (const colorScheme of COLOR_SCHEMES) {
    for (const path of PUBLIC_PAGES) {
      test(`no serious violations on ${path} (${colorScheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme })
        await page.goto(path)
        expect(await seriousViolations(page)).toEqual([])
      })
    }
  }
})

test.describe('accessibility — signed in', () => {
  test.use(signedInAs('alice'))

  for (const colorScheme of COLOR_SCHEMES) {
    for (const path of [
      `/anime/${ANIME_SLUG.starlight}`,
      `/anime/${ANIME_SLUG.starlight}/OP1`,
      '/u/alice',
      '/settings',
    ]) {
      test(`no serious violations on ${path} with controls (${colorScheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme })
        await page.goto(path)
        expect(await seriousViolations(page)).toEqual([])
      })
    }
  }
})

test.describe('accessibility — onboarding', () => {
  test.use(signedInAs('newbie'))

  test('no serious violations on onboarding', async ({ page }) => {
    await page.goto('/onboarding')
    expect(await seriousViolations(page)).toEqual([])
  })
})
