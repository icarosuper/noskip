import type { BetterAuthOptions } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { username } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import type { Database } from '#/db/client'
import * as schema from '#/db/schema'

// Shared by the app (src/lib/auth.ts) and the test auth instance (tests/support/test-auth.ts), so
// sessions created by tests are valid for the running app. Does not import `#/db` itself.
export function createAuthOptions(database: Database) {
  return {
    database: drizzleAdapter(database, { provider: 'pg', schema }),
    // Social login only — no email/password (decisions.md #3).
    socialProviders: {
      discord: {
        clientId: process.env.DISCORD_CLIENT_ID ?? '',
        clientSecret: process.env.DISCORD_CLIENT_SECRET ?? '',
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      },
    },
    // Settings → "Delete account". Everything the user owns cascades from the `user` row.
    user: { deleteUser: { enabled: true } },
    account: {
      // Same verified email on Discord and Google → one user, not two.
      accountLinking: { enabled: true, trustedProviders: ['discord', 'google'] },
    },
    plugins: [
      // The username is picked on /onboarding after the first sign-in; it is the public profile URL.
      username({ minUsernameLength: 3, maxUsernameLength: 24 }),
      // Must stay last: it sets cookies on TanStack Start responses.
      tanstackStartCookies(),
    ],
  } satisfies BetterAuthOptions
}
