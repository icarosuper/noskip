import { eq, sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { rateLimit } from '#/db/schema'
import { setupTestDatabase } from '../../../tests/support/integration'
import { countRateLimitHit, enforceRateLimit, RateLimitError, type RateLimitRule } from './queries'

const database = setupTestDatabase()
const THREE_PER_MINUTE: RateLimitRule = { maxHits: 3, windowSeconds: 60 }

describe('enforceRateLimit', () => {
  it('lets hits through up to the limit, then refuses', async () => {
    for (let hit = 0; hit < THREE_PER_MINUTE.maxHits; hit++) {
      await enforceRateLimit(database, 'writes:alice', THREE_PER_MINUTE)
    }

    await expect(enforceRateLimit(database, 'writes:alice', THREE_PER_MINUTE)).rejects.toThrow(RateLimitError)
  })

  it('counts each key on its own', async () => {
    for (let hit = 0; hit < THREE_PER_MINUTE.maxHits; hit++) {
      await enforceRateLimit(database, 'writes:alice', THREE_PER_MINUTE)
    }

    await expect(enforceRateLimit(database, 'writes:bob', THREE_PER_MINUTE)).resolves.toBeUndefined()
  })

  it('starts a new window once the old one is over', async () => {
    for (let hit = 0; hit < THREE_PER_MINUTE.maxHits; hit++) {
      await countRateLimitHit(database, 'writes:alice', THREE_PER_MINUTE)
    }
    await database
      .update(rateLimit)
      .set({ windowStartedAt: sql`now() - interval '61 seconds'` })
      .where(eq(rateLimit.key, 'writes:alice'))

    expect(await countRateLimitHit(database, 'writes:alice', THREE_PER_MINUTE)).toBe(1)
  })

  it('counts concurrent hits exactly', async () => {
    const concurrentHits = 20
    await Promise.all(
      Array.from({ length: concurrentHits }, () =>
        countRateLimitHit(database, 'writes:alice', THREE_PER_MINUTE),
      ),
    )

    const [row] = await database.select().from(rateLimit).where(eq(rateLimit.key, 'writes:alice'))
    expect(row.hits).toBe(concurrentHits)
  })
})
