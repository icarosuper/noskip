import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '#/db'
import { BIO_MAX_LENGTH } from '#/db/schema'
import { authorizeWrite, getSessionUser } from '#/features/auth/server'
import { findUserProfile, followUser, listFollows, unfollowUser, updateSettings } from './queries'

const usernameInput = z.object({ username: z.string() })

export const getUserProfile = createServerFn({ method: 'GET' })
  .validator(usernameInput)
  .handler(async ({ data }) => {
    const viewer = await getSessionUser()
    const userProfile = await findUserProfile(db, data.username, viewer?.id ?? null)
    if (!userProfile) throw notFound()
    return userProfile
  })

export const getFollowList = createServerFn({ method: 'GET' })
  .validator(usernameInput.extend({ kind: z.enum(['followers', 'following']) }))
  .handler(async ({ data }) => {
    const viewer = await getSessionUser()
    const followList = await listFollows(db, data.username, data.kind, viewer?.id ?? null)
    if (!followList) throw notFound()
    return followList
  })

export const followUserFn = createServerFn({ method: 'POST' })
  .validator(usernameInput)
  .handler(async ({ data }) => followUser(db, await authorizeWrite(), data.username))

export const unfollowUserFn = createServerFn({ method: 'POST' })
  .validator(usernameInput)
  .handler(async ({ data }) => unfollowUser(db, await authorizeWrite(), data.username))

export const saveSettings = createServerFn({ method: 'POST' })
  .validator(
    z
      .object({
        bio: z
          .string()
          .trim()
          .max(BIO_MAX_LENGTH)
          .transform((bio) => (bio === '' ? null : bio)),
        isPrivate: z.boolean(),
        showSpoilers: z.boolean(),
        showNsfw: z.boolean(),
      })
      .partial(),
  )
  .handler(async ({ data }) => updateSettings(db, await authorizeWrite(), data))
