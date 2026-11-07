import { eq } from 'drizzle-orm'
import type { Database } from '#/db/client'
import { favorite, follow, profile, rating, review, theme, user } from '#/db/schema'
import { upsertAnime } from '../../scripts/import/upsert'
import { buildFixtureCatalog } from './catalog'
import {
  FIXTURE_FAVORITES,
  FIXTURE_FOLLOWS,
  FIXTURE_PROFILES,
  FIXTURE_RATINGS,
  FIXTURE_REVIEWS,
  FIXTURE_USERS,
} from './users'

export async function seedCatalog(database: Database) {
  for (const upstreamAnime of buildFixtureCatalog()) await upsertAnime(database, upstreamAnime)
}

// Idempotent: re-creates a fixture user that a test deleted, leaves the others alone.
export async function seedUsers(database: Database) {
  const now = new Date()
  await database
    .insert(user)
    .values(
      Object.values(FIXTURE_USERS).map((fixtureUser) => ({
        id: fixtureUser.id,
        name: fixtureUser.name,
        email: fixtureUser.email,
        emailVerified: true,
        username: fixtureUser.username,
        displayUsername: fixtureUser.username,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing()
}

async function themeIdLookup(database: Database) {
  const themeRows = await database.select({ id: theme.id, animethemesId: theme.animethemesId }).from(theme)
  const themeIdByAnimethemesId = new Map(themeRows.map((row) => [row.animethemesId, row.id]))
  return (animethemesId: number) => {
    const themeId = themeIdByAnimethemesId.get(animethemesId)
    if (themeId === undefined) throw new Error(`fixture theme ${animethemesId} missing`)
    return themeId
  }
}

// Everything users create: ratings, reviews, top 10s, follows, profile settings.
export async function seedUserContent(database: Database) {
  const themeIdOf = await themeIdLookup(database)
  const userIdOf = (userKey: keyof typeof FIXTURE_USERS) => FIXTURE_USERS[userKey].id

  await database.insert(rating).values(
    FIXTURE_RATINGS.map((fixtureRating) => ({
      userId: userIdOf(fixtureRating.userKey),
      themeId: themeIdOf(fixtureRating.themeAnimethemesId),
      score: fixtureRating.score,
    })),
  )
  await database.insert(review).values(
    FIXTURE_REVIEWS.map((fixtureReview) => ({
      userId: userIdOf(fixtureReview.userKey),
      themeId: themeIdOf(fixtureReview.themeAnimethemesId),
      body: fixtureReview.body,
    })),
  )
  await database.insert(favorite).values(
    FIXTURE_FAVORITES.flatMap((fixtureFavorites) =>
      fixtureFavorites.themeAnimethemesIds.map((animethemesId, index) => ({
        userId: userIdOf(fixtureFavorites.userKey),
        themeId: themeIdOf(animethemesId),
        position: index + 1,
      })),
    ),
  )
  await database.insert(follow).values(
    FIXTURE_FOLLOWS.map((fixtureFollow) => ({
      followerId: userIdOf(fixtureFollow.followerKey),
      followingId: userIdOf(fixtureFollow.followingKey),
    })),
  )
  await database.insert(profile).values(
    FIXTURE_PROFILES.map((fixtureProfile) => ({
      userId: userIdOf(fixtureProfile.userKey),
      bio: fixtureProfile.bio ?? null,
      isPrivate: fixtureProfile.isPrivate ?? false,
    })),
  )
}

export async function seedAll(database: Database) {
  await seedCatalog(database)
  await seedUsers(database)
  await seedUserContent(database)
}

// Undo what E2E tests change (user content, usernames) without touching sessions, so the
// storage-state cookies written by `e2e:prepare` stay valid between tests. Deleting ratings
// cascades to reviews and their reports.
export async function resetMutableState(database: Database) {
  await seedUsers(database)
  await database.delete(rating)
  await database.delete(favorite)
  await database.delete(follow)
  await database.delete(profile)
  await seedUserContent(database)
  for (const fixtureUser of Object.values(FIXTURE_USERS)) {
    await database
      .update(user)
      .set({ username: fixtureUser.username, displayUsername: fixtureUser.username })
      .where(eq(user.id, fixtureUser.id))
  }
}
