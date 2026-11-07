import { sql } from 'drizzle-orm'
import type { Database } from '#/db/client'
import { rateLimit } from '#/db/schema'
import { UserFacingError } from '#/lib/errors'

export interface RateLimitRule {
  maxHits: number
  windowSeconds: number
}

// Every write a signed-in user makes (rate, review, top 10, follow, settings) shares one budget.
// Generous for a person clicking through a season, tight for a script.
export const USER_WRITE_LIMIT: RateLimitRule = { maxHits: 60, windowSeconds: 60 }

export class RateLimitError extends UserFacingError {}

// Counts one hit for `key` and returns how many hits its current window has, in one atomic upsert:
// concurrent requests can't both read "59" and both pass.
export async function countRateLimitHit(database: Database, key: string, rule: RateLimitRule) {
  const windowLength = sql`make_interval(secs => ${rule.windowSeconds})`
  const windowHasExpired = sql`${rateLimit.windowStartedAt} <= now() - ${windowLength}`
  const [row] = await database
    .insert(rateLimit)
    .values({ key, windowStartedAt: sql`now()`, hits: 1 })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        windowStartedAt: sql`case when ${windowHasExpired} then now() else ${rateLimit.windowStartedAt} end`,
        hits: sql`case when ${windowHasExpired} then 1 else ${rateLimit.hits} + 1 end`,
      },
    })
    .returning({ hits: rateLimit.hits })
  return row.hits
}

export async function enforceRateLimit(database: Database, key: string, rule: RateLimitRule) {
  const hitsInWindow = await countRateLimitHit(database, key, rule)
  const isOverLimit = hitsInWindow > rule.maxHits
  if (isOverLimit) throw new RateLimitError('Too many changes in a short time. Wait a minute and try again.')
}
