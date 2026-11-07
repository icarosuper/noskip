import { and, asc, eq } from 'drizzle-orm'
import type { Database } from '#/db/client'
import { favorite, MAX_FAVORITES, rating, review, reviewReport, theme } from '#/db/schema'
import { RATED_THEME_TYPES } from '#/features/catalog/constants'

export class RatingError extends Error {}

async function assertRatableTheme(database: Database, themeId: number) {
  const themeRow = await database.query.theme.findFirst({
    where: eq(theme.id, themeId),
    columns: { type: true },
  })
  const isRatable = themeRow !== undefined && (RATED_THEME_TYPES as readonly string[]).includes(themeRow.type)
  if (!isRatable) throw new RatingError('Only openings and endings can be rated')
}

// Re-rating overwrites — there is no rating history.
export async function upsertRating(database: Database, userId: string, themeId: number, score: number) {
  await assertRatableTheme(database, themeId)
  await database
    .insert(rating)
    .values({ userId, themeId, score })
    .onConflictDoUpdate({ target: [rating.userId, rating.themeId], set: { score, updatedAt: new Date() } })
}

// Also removes the review (it cascades from the rating).
export async function deleteRating(database: Database, userId: string, themeId: number) {
  await database.delete(rating).where(and(eq(rating.userId, userId), eq(rating.themeId, themeId)))
}

// A review needs a rating first; the composite foreign key rejects it otherwise.
export async function upsertReview(database: Database, userId: string, themeId: number, body: string) {
  const ratingRow = await database.query.rating.findFirst({
    where: and(eq(rating.userId, userId), eq(rating.themeId, themeId)),
  })
  if (!ratingRow) throw new RatingError('Rate the theme before reviewing it')
  await database
    .insert(review)
    .values({ userId, themeId, body })
    .onConflictDoUpdate({ target: [review.userId, review.themeId], set: { body, updatedAt: new Date() } })
}

export async function deleteReview(database: Database, userId: string, themeId: number) {
  await database.delete(review).where(and(eq(review.userId, userId), eq(review.themeId, themeId)))
}

// Idempotent: reporting twice keeps one report.
export async function reportReview(
  database: Database,
  reporterId: string,
  reviewUserId: string,
  themeId: number,
) {
  if (reporterId === reviewUserId) throw new RatingError('You cannot report your own review')
  await database.insert(reviewReport).values({ reporterId, reviewUserId, themeId }).onConflictDoNothing()
}

// --- Top 10 ---------------------------------------------------------------------------------
// The order lives in `position` (1–10, unique per user). Every change rewrites the user's whole
// list in one transaction — at most 10 rows, and it sidesteps the unique constraint during swaps.

export async function listFavoriteThemeIds(database: Database, userId: string) {
  const rows = await database
    .select({ themeId: favorite.themeId })
    .from(favorite)
    .where(eq(favorite.userId, userId))
    .orderBy(asc(favorite.position))
  return rows.map((row) => row.themeId)
}

async function replaceFavorites(database: Database, userId: string, themeIds: number[]) {
  await database.transaction(async (transaction) => {
    await transaction.delete(favorite).where(eq(favorite.userId, userId))
    if (themeIds.length === 0) return
    await transaction
      .insert(favorite)
      .values(themeIds.map((themeId, index) => ({ userId, themeId, position: index + 1 })))
  })
}

export async function addFavorite(database: Database, userId: string, themeId: number) {
  await assertRatableTheme(database, themeId)
  const themeIds = await listFavoriteThemeIds(database, userId)
  if (themeIds.includes(themeId)) return
  if (themeIds.length >= MAX_FAVORITES) {
    throw new RatingError(`Your top ${MAX_FAVORITES} is full — remove one first`)
  }
  await replaceFavorites(database, userId, [...themeIds, themeId])
}

export async function removeFavorite(database: Database, userId: string, themeId: number) {
  const themeIds = await listFavoriteThemeIds(database, userId)
  await replaceFavorites(
    database,
    userId,
    themeIds.filter((favoriteThemeId) => favoriteThemeId !== themeId),
  )
}

// Moves one favorite a step up (-1) or down (+1). No-op at the ends.
export async function moveFavorite(database: Database, userId: string, themeId: number, step: -1 | 1) {
  const themeIds = await listFavoriteThemeIds(database, userId)
  const from = themeIds.indexOf(themeId)
  const to = from + step
  const canMove = from !== -1 && to >= 0 && to < themeIds.length
  if (!canMove) return
  ;[themeIds[from], themeIds[to]] = [themeIds[to], themeIds[from]]
  await replaceFavorites(database, userId, themeIds)
}
