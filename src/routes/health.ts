import { createFileRoute } from '@tanstack/react-router'
import { sql } from 'drizzle-orm'
import { db } from '#/db'
import { logger } from '#/lib/logger'

const DATABASE_CHECK_TIMEOUT_MS = 2_000

async function isDatabaseReachable() {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('database check timed out')), DATABASE_CHECK_TIMEOUT_MS),
  )
  try {
    await Promise.race([db.execute(sql`select 1`), timeout])
    return true
  } catch (error) {
    logger.error({ err: error }, 'health check: database unreachable')
    return false
  }
}

// For uptime monitors and the host's health check: 200 when the app can reach Postgres, 503 when
// it can't. No details in the body; the reason goes to the log.
export const Route = createFileRoute('/health')({
  server: {
    handlers: {
      GET: async () => {
        const databaseIsReachable = await isDatabaseReachable()
        const status = databaseIsReachable ? 200 : 503
        const body = { status: databaseIsReachable ? 'ok' : 'unavailable' }
        return Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
      },
    },
  },
})
