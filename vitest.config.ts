import { defineConfig } from 'vitest/config'
import { TEST_DATABASE_URL } from './tests/support/env.ts'

// Two projects (docs/agents/testing.md):
//   unit         — *.test.ts, no database, no network. Runs in parallel.
//   integration  — *.integration.test.ts, real Postgres (noskip_test), one file at a time.
// E2E/browser tests are Playwright (playwright.config.ts), not Vitest.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'tests/**/*.test.ts'],
          exclude: ['**/*.integration.test.ts', '**/node_modules/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/**/*.integration.test.ts', 'scripts/**/*.integration.test.ts'],
          globalSetup: ['tests/support/integration-global-setup.ts'],
          // All files share one database; running them in parallel would make them see each other's rows.
          fileParallelism: false,
          // If anything imports '#/db' by mistake, it must hit the test database, never dev data.
          env: { DATABASE_URL: TEST_DATABASE_URL },
        },
      },
    ],
  },
})
