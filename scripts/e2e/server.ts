// The fixture server: seeds the E2E database, then runs the app on http://localhost:3210 against
// it. Playwright starts it through `webServer`; agents start it with `bun run e2e:server` and
// browse it (docs/agents/browser.md). Never touches the dev database.

import { E2E_AUTH_SECRET, E2E_BASE_URL, E2E_DATABASE_URL, E2E_PORT } from '../../tests/support/env'
import { prepareE2eEnvironment } from './prepare'

await prepareE2eEnvironment()

// Explicit values override anything bun loaded from .env.local.
const serverEnvironment = {
  ...process.env,
  DATABASE_URL: E2E_DATABASE_URL,
  BETTER_AUTH_URL: E2E_BASE_URL,
  BETTER_AUTH_SECRET: E2E_AUTH_SECRET,
  DISCORD_CLIENT_ID: 'e2e',
  DISCORD_CLIENT_SECRET: 'e2e',
  GOOGLE_CLIENT_ID: 'e2e',
  GOOGLE_CLIENT_SECRET: 'e2e',
}

const viteServer = Bun.spawn(['bunx', 'vite', 'dev', '--port', String(E2E_PORT), '--strictPort'], {
  env: serverEnvironment,
  stdout: 'inherit',
  stderr: 'inherit',
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    viteServer.kill()
    process.exit(0)
  })
}

console.log(`Fixture server starting on ${E2E_BASE_URL}`)
process.exit(await viteServer.exited)
