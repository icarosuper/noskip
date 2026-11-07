import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

// No side effects: tests and scripts import this to open a connection to the database they choose.
export function createDatabase(databaseUrl: string) {
  return drizzle(databaseUrl, { schema })
}

export type Database = ReturnType<typeof createDatabase>
