import { defineConfig } from '@playwright/test'
import baseConfig from './playwright.config.ts'

// `bun run ui:screens` — same server, projects and fixtures as the E2E suite, but runs the
// screenshot sweep in tests/screens/ instead of the tests. Output: tests/e2e/.artifacts/screens/.
export default defineConfig({
  ...baseConfig,
  testDir: 'tests/screens',
  outputDir: 'tests/e2e/.artifacts/screens-results',
  reporter: [['list']],
})
