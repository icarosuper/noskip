import { afterAll, beforeEach } from 'vitest'
import { createDatabase } from '#/db/client'
import { closeDatabase, truncateAllTables } from './database'
import { TEST_DATABASE_URL } from './env'

// Call at the top of an *.integration.test.ts file:
//
//   const database = setupTestDatabase()            // empty database before each test
//   const database = setupTestDatabase(seedAll)     // empty, then seeded, before each test
//
// Every test starts from the same state, so tests never depend on each other's rows.
export function setupTestDatabase(seed?: (database: ReturnType<typeof createDatabase>) => Promise<void>) {
  const database = createDatabase(TEST_DATABASE_URL)

  beforeEach(async () => {
    await truncateAllTables(database)
    if (seed) await seed(database)
  })

  afterAll(async () => {
    await closeDatabase(database)
  })

  return database
}
