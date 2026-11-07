import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Client } from 'pg'
import { createDatabase, type Database } from '#/db/client'

// Creates the database if it doesn't exist yet (the Postgres container only creates `noskip`).
export async function ensureDatabaseExists(databaseUrl: string) {
  const url = new URL(databaseUrl)
  const databaseName = url.pathname.slice(1)
  url.pathname = '/postgres'

  const adminClient = new Client({ connectionString: url.toString() })
  await adminClient.connect()
  try {
    const existing = await adminClient.query('select 1 from pg_database where datname = $1', [databaseName])
    const databaseIsMissing = existing.rowCount === 0
    if (databaseIsMissing) await adminClient.query(`create database "${databaseName}"`)
  } finally {
    await adminClient.end()
  }
}

export async function prepareDatabase(databaseUrl: string): Promise<Database> {
  await ensureDatabaseExists(databaseUrl)
  const database = createDatabase(databaseUrl)
  await migrate(database, { migrationsFolder: 'drizzle' })
  return database
}

// Empties every app table (keeps the migrations journal). Faster than drop + migrate.
export async function truncateAllTables(database: Database) {
  const tables = await database.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  )
  const tableList = tables.rows.map((row) => `"${row.tablename}"`).join(', ')
  if (tableList) await database.execute(sql.raw(`truncate ${tableList} restart identity cascade`))
}

export async function closeDatabase(database: Database) {
  await database.$client.end()
}
