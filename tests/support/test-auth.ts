import { betterAuth } from 'better-auth'
import { testUtils } from 'better-auth/plugins'
import type { Database } from '#/db/client'
import { createAuthOptions } from '#/lib/auth-options'
import { E2E_AUTH_SECRET, E2E_BASE_URL } from './env'

// Same config as the app plus Better Auth's testUtils plugin, which creates real sessions without
// going through OAuth. Never imported by app code (decisions.md #8).
// `server` defaults to the E2E fixture server; the demo seed (scripts/dev/seed-demo.ts) passes the
// dev server's secret and URL instead.
export interface AuthServer {
  secret: string
  baseURL: string
}

const E2E_SERVER: AuthServer = { secret: E2E_AUTH_SECRET, baseURL: E2E_BASE_URL }

export function createTestAuth(database: Database, server: AuthServer = E2E_SERVER) {
  const appOptions = createAuthOptions(database)
  return betterAuth({
    ...appOptions,
    secret: server.secret,
    baseURL: server.baseURL,
    // Never used (tests sign in through testUtils), but empty ids make Better Auth warn on every run.
    socialProviders: {
      discord: { clientId: 'e2e', clientSecret: 'e2e' },
      google: { clientId: 'e2e', clientSecret: 'e2e' },
    },
    plugins: [...appOptions.plugins, testUtils()],
  })
}

// Playwright storage state (also accepted by `agent-browser --state`) for a signed-in user.
export async function createStorageState(
  database: Database,
  userId: string,
  server: AuthServer = E2E_SERVER,
) {
  const testAuth = createTestAuth(database, server)
  const context = await testAuth.$context
  const cookies = await context.test.getCookies({ userId, domain: 'localhost' })
  return {
    cookies: cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires ?? -1,
      httpOnly: cookie.httpOnly ?? true,
      secure: cookie.secure ?? false,
      sameSite: cookie.sameSite ?? 'Lax',
    })),
    origins: [],
  }
}
