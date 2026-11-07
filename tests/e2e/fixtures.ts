import { test as base, expect, type Page } from '@playwright/test'
import { createDatabase } from '#/db/client'
import { resetMutableState } from '../fixtures/seed'
import { FIXTURE_USERS, type FixtureUserKey } from '../fixtures/users'
import { authStatePath, E2E_DATABASE_URL } from '../support/env'
import { createStorageState } from '../support/test-auth'

// Every spec imports `test`/`expect` from here, not from @playwright/test.
//
// What this adds to every test, automatically:
//   - page.goto/page.reload wait for <html data-hydrated> — interacting before React hydrates
//     clicks inert HTML (decisions.md #9).
//   - the E2E database's mutable state (ratings, newbie's username) is reset before the test.
//   - any console.error or uncaught page error fails the test — catches hydration mismatches and
//     React errors a passing assertion would hide. A test that expects some (e.g. a 404 page)
//     declares them: `test.use({ allowedBrowserErrors: [/status of 404/] })`.

interface TestFixtures {
  allowedBrowserErrors: RegExp[]
  signInWithNewSession: (userKey: FixtureUserKey) => Promise<void>
  resetDatabase: void
  failOnBrowserErrors: void
}

interface WorkerFixtures {
  database: ReturnType<typeof createDatabase>
}

export async function waitForHydration(page: Page) {
  await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' })
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  database: [
    async ({}, use) => {
      const database = createDatabase(E2E_DATABASE_URL)
      await use(database)
      await database.$client.end()
    },
    { scope: 'worker' },
  ],

  page: async ({ page }, use) => {
    const originalGoto = page.goto.bind(page)
    const originalReload = page.reload.bind(page)
    page.goto = async (...args) => {
      const response = await originalGoto(...args)
      await waitForHydration(page)
      return response
    }
    page.reload = async (...args) => {
      const response = await originalReload(...args)
      await waitForHydration(page)
      return response
    }
    await use(page)
  },

  allowedBrowserErrors: [[], { option: true }],

  // For tests that end the session (sign out): a session of their own, so the shared storage-state
  // session other tests reuse is not revoked.
  signInWithNewSession: async ({ context, database }, use) => {
    await use(async (userKey) => {
      const storageState = await createStorageState(database, FIXTURE_USERS[userKey].id)
      await context.addCookies(storageState.cookies)
    })
  },

  resetDatabase: [
    async ({ database }, use) => {
      await resetMutableState(database)
      await use()
    },
    { auto: true },
  ],

  failOnBrowserErrors: [
    async ({ page, allowedBrowserErrors }, use) => {
      const browserErrors: string[] = []
      const recordUnlessAllowed = (message: string) => {
        const isAllowed = allowedBrowserErrors.some((pattern) => pattern.test(message))
        if (!isAllowed) browserErrors.push(message)
      }
      page.on('console', (message) => {
        if (message.type() === 'error') recordUnlessAllowed(`console.error: ${message.text()}`)
      })
      page.on('pageerror', (error) => recordUnlessAllowed(`page error: ${error.message}`))
      await use()
      expect(browserErrors, 'the browser logged errors during this test').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

// `test.use(signedInAs('alice'))` at the top of a describe block. The session is shared by every
// test that uses it — a test that signs out must use `signInWithNewSession` instead.
export function signedInAs(userKey: FixtureUserKey) {
  return { storageState: authStatePath(userKey) }
}
