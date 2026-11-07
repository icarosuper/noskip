import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// Fixed-window counters for abuse limits (features/abuse). In Postgres rather than in memory so
// the limit holds across instances and serverless invocations (decisions.md #13). One row per key
// (e.g. `writes:<userId>`), reused window after window, so the table stays as small as the user
// base.
export const rateLimit = pgTable('rate_limit', {
  key: text().primaryKey(),
  windowStartedAt: timestamp('window_started_at').notNull(),
  hits: integer().notNull(),
})
