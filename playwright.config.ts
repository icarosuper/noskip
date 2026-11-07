import { defineConfig, devices } from '@playwright/test'
import { E2E_BASE_URL } from './tests/support/env.ts'

const isCi = Boolean(process.env.CI)

// E2E tests run against the fixture server (scripts/e2e/server.ts): app on :3210, E2E database,
// fixture users already signed in through storage states. See docs/agents/testing.md.
export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'tests/e2e/.artifacts/results',
  // One shared database: tests reset it in a fixture, so they can't run concurrently.
  workers: 1,
  fullyParallel: false,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'tests/e2e/.artifacts/report', open: 'never' }]],
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'bun scripts/e2e/server.ts',
    url: E2E_BASE_URL,
    // Locally, reuse a fixture server an agent or you already started (`bun run e2e:server`).
    reuseExistingServer: !isCi,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
