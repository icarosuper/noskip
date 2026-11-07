// Resets the E2E database to the fixture data and writes one signed-in storage state per fixture
// user to tests/e2e/.auth/<user>.json. Run by `bun run e2e:prepare` and by scripts/e2e/server.ts.

import { mkdir } from 'node:fs/promises'
import { seedAll } from '../../tests/fixtures/seed'
import { FIXTURE_USERS, type FixtureUserKey } from '../../tests/fixtures/users'
import { closeDatabase, prepareDatabase, truncateAllTables } from '../../tests/support/database'
import { AUTH_STATE_DIRECTORY, authStatePath, E2E_DATABASE_URL } from '../../tests/support/env'
import { createStorageState } from '../../tests/support/test-auth'

export async function prepareE2eEnvironment() {
  const database = await prepareDatabase(E2E_DATABASE_URL)
  try {
    await truncateAllTables(database)
    await seedAll(database)

    await mkdir(AUTH_STATE_DIRECTORY, { recursive: true })
    for (const userKey of Object.keys(FIXTURE_USERS) as FixtureUserKey[]) {
      const storageState = await createStorageState(database, FIXTURE_USERS[userKey].id)
      await Bun.write(authStatePath(userKey), JSON.stringify(storageState, null, 2))
    }
  } finally {
    await closeDatabase(database)
  }
}

if (import.meta.main) {
  await prepareE2eEnvironment()
  console.log(`E2E database seeded; storage states in ${AUTH_STATE_DIRECTORY}/`)
}
