// Not a test: a screenshot sweep for visual review (`bun run ui:screens`). Captures every main page
// in each viewport (Playwright projects) × color scheme into tests/e2e/.artifacts/screens/, so an
// agent or a person can review the whole UI by opening the PNGs. Never fails on looks — only if a
// page doesn't load or the browser logs errors.

import { expect, signedInAs, test } from '../e2e/fixtures'
import { ANIME_SLUG } from '../fixtures/catalog'
import type { FixtureUserKey } from '../fixtures/users'

interface Screen {
  name: string
  path: string
  as?: FixtureUserKey
}

const SCREENS: Screen[] = [
  { name: 'home-anonymous', path: '/' },
  { name: 'home', path: '/', as: 'alice' },
  { name: 'rankings', path: '/rankings' },
  { name: 'rankings-season', path: '/rankings?year=2024&season=SPRING' },
  { name: 'season', path: '/season/2024/spring' },
  { name: 'search', path: '/search?q=ro' },
  { name: 'anime', path: `/anime/${ANIME_SLUG.starlight}`, as: 'alice' },
  { name: 'anime-spoiler', path: `/anime/${ANIME_SLUG.iron}` },
  { name: 'theme-anonymous', path: `/anime/${ANIME_SLUG.starlight}/OP1` },
  { name: 'theme', path: `/anime/${ANIME_SLUG.starlight}/OP1`, as: 'alice' },
  { name: 'artist', path: '/artist/mika_sato' },
  { name: 'profile-own', path: '/u/alice', as: 'alice' },
  { name: 'profile-other', path: '/u/bob', as: 'alice' },
  { name: 'profile-private', path: '/u/carol', as: 'alice' },
  { name: 'followers', path: '/u/bob/followers' },
  { name: 'settings', path: '/settings', as: 'alice' },
  { name: 'login', path: '/login' },
  { name: 'onboarding', path: '/onboarding', as: 'newbie' },
]

const COLOR_SCHEMES = ['light', 'dark'] as const

for (const screen of SCREENS) {
  test.describe(screen.name, () => {
    if (screen.as) test.use(signedInAs(screen.as))

    for (const colorScheme of COLOR_SCHEMES) {
      test(`${screen.name} (${colorScheme})`, async ({ page }, testInfo) => {
        await page.emulateMedia({ colorScheme })
        // The page's own theme toggle follows the OS unless a choice was saved; none is here.
        const response = await page.goto(screen.path)
        expect(response?.ok()).toBe(true)

        const screenshotPath = `tests/e2e/.artifacts/screens/${testInfo.project.name}-${colorScheme}/${screen.name}.png`
        await page.screenshot({ path: screenshotPath, fullPage: true })
      })
    }
  })
}
