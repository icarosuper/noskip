import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '#/db'
import { REVIEW_MAX_LENGTH } from '#/db/schema'
import { requireUserId } from '#/features/auth/server'
import {
  addFavorite,
  deleteRating,
  deleteReview,
  moveFavorite,
  removeFavorite,
  reportReview,
  upsertRating,
  upsertReview,
} from './queries'

const themeInput = z.object({ themeId: z.number().int() })

export const rateTheme = createServerFn({ method: 'POST' })
  .validator(themeInput.extend({ score: z.number().int().min(1).max(10) }))
  .handler(async ({ data }) => upsertRating(db, await requireUserId(), data.themeId, data.score))

export const removeRating = createServerFn({ method: 'POST' })
  .validator(themeInput)
  .handler(async ({ data }) => deleteRating(db, await requireUserId(), data.themeId))

export const saveReview = createServerFn({ method: 'POST' })
  .validator(themeInput.extend({ body: z.string().trim().min(1).max(REVIEW_MAX_LENGTH) }))
  .handler(async ({ data }) => upsertReview(db, await requireUserId(), data.themeId, data.body))

export const removeReview = createServerFn({ method: 'POST' })
  .validator(themeInput)
  .handler(async ({ data }) => deleteReview(db, await requireUserId(), data.themeId))

export const reportThemeReview = createServerFn({ method: 'POST' })
  .validator(themeInput.extend({ username: z.string() }))
  .handler(async ({ data }) => {
    const reporterId = await requireUserId()
    const reviewer = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.username, data.username.toLowerCase()),
      columns: { id: true },
    })
    if (!reviewer) return
    await reportReview(db, reporterId, reviewer.id, data.themeId)
  })

export const favoriteTheme = createServerFn({ method: 'POST' })
  .validator(themeInput)
  .handler(async ({ data }) => addFavorite(db, await requireUserId(), data.themeId))

export const unfavoriteTheme = createServerFn({ method: 'POST' })
  .validator(themeInput)
  .handler(async ({ data }) => removeFavorite(db, await requireUserId(), data.themeId))

export const moveFavoriteTheme = createServerFn({ method: 'POST' })
  .validator(themeInput.extend({ step: z.union([z.literal(-1), z.literal(1)]) }))
  .handler(async ({ data }) => moveFavorite(db, await requireUserId(), data.themeId, data.step))
