// Fixed settings for automated tests and the fixture server. Nothing here is secret: these
// databases only ever hold fixture data. CI can point them elsewhere through the env vars.

const BASE_DATABASE_URL = process.env.TEST_DATABASE_BASE_URL ?? 'postgresql://noskip:noskip@localhost:5432'

// Vitest integration tests. Wiped before every test.
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? `${BASE_DATABASE_URL}/noskip_test`

// Playwright + the fixture server agents browse. Re-seeded on every `bun run e2e:prepare`.
export const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? `${BASE_DATABASE_URL}/noskip_e2e`

export const E2E_PORT = 3210
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`

// Shared by the fixture server and the test auth instance, so test-made session cookies validate.
export const E2E_AUTH_SECRET = 'e2e-only-secret-not-used-anywhere-else-0123456789'

// Playwright storage-state files (cookies of a signed-in fixture user), one per user.
export const AUTH_STATE_DIRECTORY = 'tests/e2e/.auth'

export function authStatePath(fixtureUserKey: string) {
  return `${AUTH_STATE_DIRECTORY}/${fixtureUserKey}.json`
}
