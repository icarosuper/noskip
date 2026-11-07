import { and, eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { MAX_FAVORITES, rating, review, reviewReport, theme } from '#/db/schema'
import { upsertAnime } from '../../../scripts/import/upsert'
import { buildFixtureCatalog, THEME } from '../../../tests/fixtures/catalog'
import { seedAll } from '../../../tests/fixtures/seed'
import { FIXTURE_USERS } from '../../../tests/fixtures/users'
import { setupTestDatabase } from '../../../tests/support/integration'
import {
  addFavorite,
  deleteRating,
  deleteReview,
  listFavoriteThemeIds,
  moveFavorite,
  RatingError,
  removeFavorite,
  reportReview,
  upsertRating,
  upsertReview,
} from './queries'

const database = setupTestDatabase(seedAll)

async function themeIdOf(themeAnimethemesId: number) {
  const themeRow = await database.query.theme.findFirst({
    where: eq(theme.animethemesId, themeAnimethemesId),
  })
  if (!themeRow) throw new Error(`fixture theme ${themeAnimethemesId} missing`)
  return themeRow.id
}

async function scoreOf(userId: string, themeId: number) {
  const ratingRow = await database.query.rating.findFirst({
    where: and(eq(rating.userId, userId), eq(rating.themeId, themeId)),
  })
  return ratingRow?.score ?? null
}

describe('upsertRating', () => {
  it('creates a rating', async () => {
    const themeId = await themeIdOf(THEME.kitchenEd1)

    await upsertRating(database, FIXTURE_USERS.bob.id, themeId, 7)

    expect(await scoreOf(FIXTURE_USERS.bob.id, themeId)).toBe(7)
  })

  it('overwrites the previous score instead of adding a second rating', async () => {
    const themeId = await themeIdOf(THEME.starlightOp1)
    const ratingCountBefore = await database.$count(rating)

    await upsertRating(database, FIXTURE_USERS.alice.id, themeId, 3)

    expect(await scoreOf(FIXTURE_USERS.alice.id, themeId)).toBe(3)
    expect(await database.$count(rating)).toBe(ratingCountBefore)
  })

  it('refuses insert songs (not rated in v0)', async () => {
    const themeId = await themeIdOf(THEME.starlightIn1)

    await expect(upsertRating(database, FIXTURE_USERS.bob.id, themeId, 7)).rejects.toThrow(RatingError)
  })

  it.each([0, 11])('is rejected by the database for score %i', async (outOfRangeScore) => {
    const themeId = await themeIdOf(THEME.kitchenEd1)

    await expect(upsertRating(database, FIXTURE_USERS.bob.id, themeId, outOfRangeScore)).rejects.toThrow()
  })
})

describe('deleteRating', () => {
  it("removes only that user's rating of that theme", async () => {
    const themeId = await themeIdOf(THEME.starlightOp1)

    await deleteRating(database, FIXTURE_USERS.alice.id, themeId)

    expect(await scoreOf(FIXTURE_USERS.alice.id, themeId)).toBeNull()
    expect(await scoreOf(FIXTURE_USERS.bob.id, themeId)).toBe(9)
  })
})

describe('reviews', () => {
  it('needs a rating first', async () => {
    const themeId = await themeIdOf(THEME.kitchenEd1)

    await expect(upsertReview(database, FIXTURE_USERS.bob.id, themeId, 'Nice')).rejects.toThrow(RatingError)
  })

  it('creates, then overwrites, a review', async () => {
    const themeId = await themeIdOf(THEME.starlightOp1)

    await upsertReview(database, FIXTURE_USERS.alice.id, themeId, 'First take')
    await upsertReview(database, FIXTURE_USERS.alice.id, themeId, 'Second take')

    const reviewRow = await database.query.review.findFirst({
      where: and(eq(review.userId, FIXTURE_USERS.alice.id), eq(review.themeId, themeId)),
    })
    expect(reviewRow?.body).toBe('Second take')
  })

  it('goes away with the rating', async () => {
    const themeId = await themeIdOf(THEME.starlightOp1)

    await deleteRating(database, FIXTURE_USERS.bob.id, themeId)

    expect(await database.$count(review, eq(review.userId, FIXTURE_USERS.bob.id))).toBe(0)
  })

  it('can be reported once per reporter, never by its author', async () => {
    const themeId = await themeIdOf(THEME.starlightOp1)

    await reportReview(database, FIXTURE_USERS.alice.id, FIXTURE_USERS.bob.id, themeId)
    await reportReview(database, FIXTURE_USERS.alice.id, FIXTURE_USERS.bob.id, themeId)

    expect(await database.$count(reviewReport)).toBe(1)
    await expect(reportReview(database, FIXTURE_USERS.bob.id, FIXTURE_USERS.bob.id, themeId)).rejects.toThrow(
      RatingError,
    )
  })
})

describe('top 10', () => {
  async function favoritesOf(userId: string) {
    const themeIds = await listFavoriteThemeIds(database, userId)
    const rows = await database.select({ id: theme.id, animethemesId: theme.animethemesId }).from(theme)
    return themeIds.map((themeId) => rows.find((row) => row.id === themeId)?.animethemesId)
  }

  it('appends, moves and removes, keeping positions dense', async () => {
    const aliceId = FIXTURE_USERS.alice.id
    await addFavorite(database, aliceId, await themeIdOf(THEME.kitchenOp1))
    await moveFavorite(database, aliceId, await themeIdOf(THEME.kitchenOp1), -1)
    await removeFavorite(database, aliceId, await themeIdOf(THEME.starlightOp1))

    expect(await favoritesOf(aliceId)).toEqual([THEME.ironOp1, THEME.kitchenOp1, THEME.starlightEd1])
  })

  it('ignores a move past either end and a duplicate add', async () => {
    const aliceId = FIXTURE_USERS.alice.id
    await moveFavorite(database, aliceId, await themeIdOf(THEME.starlightOp1), -1)
    await addFavorite(database, aliceId, await themeIdOf(THEME.starlightOp1))

    expect(await favoritesOf(aliceId)).toEqual([THEME.starlightOp1, THEME.ironOp1, THEME.starlightEd1])
  })

  it('refuses an 11th favorite and insert songs', async () => {
    // The fixture has 8 ratable themes; an extra anime brings it past 10.
    await upsertAnime(database, {
      ...buildFixtureCatalog()[0],
      id: 1999,
      slug: 'extra_anime',
      animethemes: [1, 2, 3].map((sequence) => ({
        id: 9990 + sequence,
        type: 'OP' as const,
        sequence,
        slug: `OP${sequence}`,
        song: null,
        animethemeentries: [],
      })),
    })
    const ratableIds = (await database.select({ id: theme.id, type: theme.type }).from(theme))
      .filter((row) => row.type !== 'IN')
      .map((row) => row.id)
    const bobId = FIXTURE_USERS.bob.id
    for (const themeId of ratableIds.slice(0, MAX_FAVORITES)) await addFavorite(database, bobId, themeId)

    await expect(addFavorite(database, bobId, ratableIds[MAX_FAVORITES])).rejects.toThrow(RatingError)
    await expect(addFavorite(database, bobId, await themeIdOf(THEME.starlightIn1))).rejects.toThrow(
      RatingError,
    )
    expect(await listFavoriteThemeIds(database, bobId)).toHaveLength(MAX_FAVORITES)
  })
})

// Every write takes the acting user's id from the session (authorizeWrite) and must only touch that
// user's rows, whatever theme id the client sends. Bob acting on themes where Alice has data:
describe("ownership: a user's writes never touch another user's rows", () => {
  it("deleting a review leaves other users' reviews of the theme", async () => {
    const themeId = await themeIdOf(THEME.starlightOp1)

    await deleteReview(database, FIXTURE_USERS.alice.id, themeId)

    expect(await database.$count(review, eq(review.userId, FIXTURE_USERS.bob.id))).toBe(1)
  })

  it("removing or moving a favorite leaves other users' top 10s", async () => {
    const aliceId = FIXTURE_USERS.alice.id
    const aliceTopBefore = await listFavoriteThemeIds(database, aliceId)

    await removeFavorite(database, FIXTURE_USERS.bob.id, await themeIdOf(THEME.starlightOp1))
    await moveFavorite(database, FIXTURE_USERS.bob.id, await themeIdOf(THEME.ironOp1), -1)

    expect(await listFavoriteThemeIds(database, aliceId)).toEqual(aliceTopBefore)
  })
})
