import { createDatabase } from './client'

export { createDatabase, type Database } from './client'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is not set — see .env.example')

// The app's connection. Query functions (features/*/queries.ts) take a `Database` parameter
// instead of importing this, so tests can pass a connection to the test database.
// Tests must import '#/db/client', never this file.
export const db = createDatabase(databaseUrl)
