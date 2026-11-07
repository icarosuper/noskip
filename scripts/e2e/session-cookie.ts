// Prints a line to paste in the browser console (on http://localhost:3210) to browse the fixture
// server signed in as a fixture user — for reviewing the UI by hand, no OAuth needed.
// Usage: bun run e2e:cookie alice   (run `bun run e2e:server` or `e2e:prepare` first)

import { FIXTURE_USERS, type FixtureUserKey } from '../../tests/fixtures/users'
import { authStatePath } from '../../tests/support/env'

const userKey = (process.argv[2] ?? 'alice') as FixtureUserKey
if (!(userKey in FIXTURE_USERS)) {
  console.error(`Unknown fixture user "${userKey}". One of: ${Object.keys(FIXTURE_USERS).join(', ')}`)
  process.exit(1)
}

const storageState = (await Bun.file(authStatePath(userKey)).json()) as {
  cookies: { name: string; value: string }[]
}
const assignments = storageState.cookies.map(
  (cookie) => `document.cookie = ${JSON.stringify(`${cookie.name}=${cookie.value}; path=/`)}`,
)
console.log(`${assignments.join('; ')}; location.reload()`)
