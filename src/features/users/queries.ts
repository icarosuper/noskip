import { and, asc, desc, eq, sql } from 'drizzle-orm'
import type { Database } from '#/db/client'
import { anime, favorite, follow, profile, rating, review, song, theme, user } from '#/db/schema'
import { themeSummaryColumns } from '#/features/catalog/theme-summary'

export interface UserSettings {
  bio: string | null
  isPrivate: boolean
  showSpoilers: boolean
  showNsfw: boolean
}

export const DEFAULT_SETTINGS: UserSettings = {
  bio: null,
  isPrivate: false,
  showSpoilers: false,
  showNsfw: false,
}

export async function findSettings(database: Database, userId: string): Promise<UserSettings> {
  const row = await database.query.profile.findFirst({ where: eq(profile.userId, userId) })
  if (!row) return DEFAULT_SETTINGS
  return { bio: row.bio, isPrivate: row.isPrivate, showSpoilers: row.showSpoilers, showNsfw: row.showNsfw }
}

export async function updateSettings(database: Database, userId: string, changes: Partial<UserSettings>) {
  await database
    .insert(profile)
    .values({ ...DEFAULT_SETTINGS, ...changes, userId })
    .onConflictDoUpdate({ target: profile.userId, set: { ...changes, updatedAt: new Date() } })
}

function findUserByUsername(database: Database, username: string) {
  // Usernames are stored lowercased by the username plugin.
  return database.query.user.findFirst({
    where: eq(user.username, username.toLowerCase()),
    columns: { id: true, name: true, image: true, username: true, displayUsername: true, createdAt: true },
  })
}

// `null` when no user has this username. A private profile (seen by someone else) comes back with
// `isHidden: true` and nothing but the name.
export async function findUserProfile(database: Database, username: string, viewerUserId: string | null) {
  const profileUser = await findUserByUsername(database, username)
  if (!profileUser) return null
  const userId = profileUser.id
  const isOwner = viewerUserId === userId

  const [settings, followerCount, followingCount, isFollowing] = await Promise.all([
    findSettings(database, userId),
    database.$count(follow, eq(follow.followingId, userId)),
    database.$count(follow, eq(follow.followerId, userId)),
    viewerUserId === null || isOwner
      ? Promise.resolve(false)
      : database
          .$count(follow, and(eq(follow.followerId, viewerUserId), eq(follow.followingId, userId)))
          .then((count) => count > 0),
  ])

  const base = {
    user: profileUser,
    bio: settings.bio,
    isOwner,
    isFollowing,
    followerCount,
    followingCount,
  }
  if (settings.isPrivate && !isOwner) return { ...base, isHidden: true as const }

  const [favorites, ratings] = await Promise.all([
    database
      .select({ ...themeSummaryColumns, position: favorite.position, score: rating.score })
      .from(favorite)
      .innerJoin(theme, eq(theme.id, favorite.themeId))
      .innerJoin(anime, eq(anime.id, theme.animeId))
      .leftJoin(song, eq(song.id, theme.songId))
      .leftJoin(rating, and(eq(rating.userId, favorite.userId), eq(rating.themeId, favorite.themeId)))
      .where(eq(favorite.userId, userId))
      .orderBy(asc(favorite.position)),
    database
      .select({
        ...themeSummaryColumns,
        score: rating.score,
        ratedAt: rating.updatedAt,
        hasReview: sql<boolean>`${review.userId} is not null`,
      })
      .from(rating)
      .innerJoin(theme, eq(theme.id, rating.themeId))
      .innerJoin(anime, eq(anime.id, theme.animeId))
      .leftJoin(song, eq(song.id, theme.songId))
      .leftJoin(review, and(eq(review.userId, rating.userId), eq(review.themeId, rating.themeId)))
      .where(eq(rating.userId, userId))
      .orderBy(desc(rating.score), desc(rating.updatedAt), theme.id),
  ])

  const distribution = Array.from({ length: 10 }, (_, index) => ({
    score: index + 1,
    count: ratings.filter((userRating) => userRating.score === index + 1).length,
  }))
  const stats = {
    ratedCount: ratings.length,
    meanScore:
      ratings.length === 0
        ? null
        : ratings.reduce((sum, userRating) => sum + userRating.score, 0) / ratings.length,
    openingCount: ratings.filter((userRating) => userRating.type === 'OP').length,
    endingCount: ratings.filter((userRating) => userRating.type === 'ED').length,
    reviewCount: ratings.filter((userRating) => userRating.hasReview).length,
    distribution,
  }

  return { ...base, isHidden: false as const, favorites, ratings, stats }
}

export type FollowListKind = 'followers' | 'following'

// `null` when the user doesn't exist or is private (and the viewer isn't them).
export async function listFollows(
  database: Database,
  username: string,
  kind: FollowListKind,
  viewerUserId: string | null,
) {
  const profileUser = await findUserByUsername(database, username)
  if (!profileUser) return null
  const settings = await findSettings(database, profileUser.id)
  if (settings.isPrivate && viewerUserId !== profileUser.id) return null

  const [listedColumn, filterColumn] =
    kind === 'followers' ? [follow.followerId, follow.followingId] : [follow.followingId, follow.followerId]

  const users = await database
    .select({
      username: user.username,
      displayUsername: user.displayUsername,
      image: user.image,
      bio: profile.bio,
    })
    .from(follow)
    .innerJoin(user, eq(user.id, listedColumn))
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(eq(filterColumn, profileUser.id))
    .orderBy(desc(follow.createdAt))

  return { user: profileUser, users }
}

export async function followUser(database: Database, followerId: string, username: string) {
  const target = await findUserByUsername(database, username)
  if (!target || target.id === followerId) return
  await database.insert(follow).values({ followerId, followingId: target.id }).onConflictDoNothing()
}

export async function unfollowUser(database: Database, followerId: string, username: string) {
  const target = await findUserByUsername(database, username)
  if (!target) return
  await database
    .delete(follow)
    .where(and(eq(follow.followerId, followerId), eq(follow.followingId, target.id)))
}
