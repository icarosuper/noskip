import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'
import type { Database } from '#/db/client'
import {
  anime,
  artist,
  favorite,
  follow,
  profile,
  rating,
  review,
  song,
  songArtist,
  theme,
  user,
} from '#/db/schema'
import { MIN_VOTES_GLOBAL } from '#/features/rankings/bayesian'
import { queryRanking } from '#/features/rankings/queries'
import type { Season } from './constants'
import { isRatedThemeType, themeSummaryColumns } from './theme-summary'

const SEARCH_LIMIT = 20

const animeSummaryColumns = {
  slug: anime.slug,
  titleRomaji: anime.titleRomaji,
  titleEnglish: anime.titleEnglish,
  coverUrl: anime.coverSmallUrl,
  year: anime.year,
  season: anime.season,
  format: anime.format,
}

const voteCount = sql<number>`count(${rating.score})`.mapWith(Number)
const averageScore = sql<number | null>`avg(${rating.score})`.mapWith((value) =>
  value === null ? null : Number(value),
)

function escapeLikePattern(query: string) {
  return `%${query.replace(/[\\%_]/g, (character) => `\\${character}`)}%`
}

export async function searchCatalog(database: Database, query: string) {
  const pattern = escapeLikePattern(query)

  const [animeResults, themeResults, artistResults] = await Promise.all([
    database
      .select(animeSummaryColumns)
      .from(anime)
      .where(or(ilike(anime.titleRomaji, pattern), ilike(anime.titleEnglish, pattern)))
      .orderBy(sql`${anime.year} desc nulls last`, asc(anime.titleRomaji))
      .limit(SEARCH_LIMIT),
    database
      .select(themeSummaryColumns)
      .from(theme)
      .innerJoin(anime, eq(anime.id, theme.animeId))
      .innerJoin(song, eq(song.id, theme.songId))
      .where(and(isRatedThemeType, or(ilike(song.titleRomaji, pattern), ilike(song.titleNative, pattern))))
      .orderBy(asc(song.titleRomaji), asc(theme.id))
      .limit(SEARCH_LIMIT),
    database
      .select({ slug: artist.slug, name: artist.name, nameNative: artist.nameNative })
      .from(artist)
      .where(or(ilike(artist.name, pattern), ilike(artist.nameNative, pattern)))
      .orderBy(asc(artist.name))
      .limit(SEARCH_LIMIT),
  ])

  return { anime: animeResults, themes: themeResults, artists: artistResults }
}

export function listSeasonAnime(database: Database, year: number, season: Season) {
  return database
    .select(animeSummaryColumns)
    .from(anime)
    .where(and(eq(anime.year, year), eq(anime.season, season)))
    .orderBy(asc(anime.titleRomaji))
}

// `null` when the slug doesn't exist. `viewerUserId` fills `myScore`; null for anonymous visitors.
export async function findAnimeDetail(database: Database, slug: string, viewerUserId: string | null) {
  const animeRow = await database.query.anime.findFirst({ where: eq(anime.slug, slug) })
  if (!animeRow) return null

  const themes = await database
    .select({
      ...themeSummaryColumns,
      voteCount,
      averageScore,
      myScore: sql<number | null>`max(${rating.score}) filter (where ${rating.userId} = ${viewerUserId})`,
    })
    .from(theme)
    .innerJoin(anime, eq(anime.id, theme.animeId))
    .leftJoin(song, eq(song.id, theme.songId))
    .leftJoin(rating, eq(rating.themeId, theme.id))
    .where(and(eq(theme.animeId, animeRow.id), isRatedThemeType))
    .groupBy(theme.id, anime.id, song.id)
    .orderBy(asc(theme.type), sql`${theme.sequence} nulls first`, asc(theme.slug))

  return { anime: animeRow, themes }
}

// The signed-in viewer's own score, review and top-10 slot for one theme.
async function findViewerState(database: Database, viewerUserId: string, themeId: number) {
  const [ratingRow, reviewRow, favoriteRows] = await Promise.all([
    database.query.rating.findFirst({
      where: and(eq(rating.userId, viewerUserId), eq(rating.themeId, themeId)),
    }),
    database.query.review.findFirst({
      where: and(eq(review.userId, viewerUserId), eq(review.themeId, themeId)),
    }),
    database
      .select({ themeId: favorite.themeId, position: favorite.position })
      .from(favorite)
      .where(eq(favorite.userId, viewerUserId)),
  ])
  return {
    score: ratingRow?.score ?? null,
    reviewBody: reviewRow?.body ?? null,
    favoritePosition: favoriteRows.find((row) => row.themeId === themeId)?.position ?? null,
    favoriteCount: favoriteRows.length,
  }
}

// Everything the theme page shows. `null` when the anime or the theme slug doesn't exist.
export async function findThemeDetail(
  database: Database,
  animeSlug: string,
  themeSlug: string,
  viewerUserId: string | null,
) {
  const [summary] = await database
    .select({
      ...themeSummaryColumns,
      songId: theme.songId,
      animeYear: anime.year,
      animeSeason: anime.season,
    })
    .from(theme)
    .innerJoin(anime, eq(anime.id, theme.animeId))
    .leftJoin(song, eq(song.id, theme.songId))
    .where(and(eq(anime.slug, animeSlug), eq(theme.slug, themeSlug), isRatedThemeType))
  if (!summary) return null
  const { themeId } = summary

  const [artists, distributionRows, globalRanking, seasonRanking, viewer, followedScores, reviews] =
    await Promise.all([
      summary.songId === null
        ? Promise.resolve([])
        : database
            .select({
              slug: artist.slug,
              name: sql<string>`coalesce(${songArtist.creditedAs}, ${artist.name})`,
            })
            .from(songArtist)
            .innerJoin(artist, eq(artist.id, songArtist.artistId))
            .where(eq(songArtist.songId, summary.songId))
            .orderBy(asc(artist.name)),
      database
        .select({ score: rating.score, count: sql<number>`count(*)`.mapWith(Number) })
        .from(rating)
        .where(eq(rating.themeId, themeId))
        .groupBy(rating.score),
      queryRanking(database, { limit: 10_000 }),
      summary.animeYear !== null && summary.animeSeason !== null
        ? queryRanking(database, { year: summary.animeYear, season: summary.animeSeason, limit: 10_000 })
        : Promise.resolve([]),
      viewerUserId === null ? Promise.resolve(null) : findViewerState(database, viewerUserId, themeId),
      viewerUserId === null
        ? Promise.resolve([])
        : database
            .select({ username: user.username, displayUsername: user.displayUsername, score: rating.score })
            .from(follow)
            .innerJoin(user, eq(user.id, follow.followingId))
            .innerJoin(rating, and(eq(rating.userId, follow.followingId), eq(rating.themeId, themeId)))
            .leftJoin(profile, eq(profile.userId, follow.followingId))
            .where(
              and(eq(follow.followerId, viewerUserId), sql`coalesce(${profile.isPrivate}, false) = false`),
            )
            .orderBy(desc(rating.score), asc(user.username)),
      database
        .select({
          username: user.username,
          displayUsername: user.displayUsername,
          image: user.image,
          score: rating.score,
          body: review.body,
          updatedAt: review.updatedAt,
          isViewer: sql<boolean>`${review.userId} = ${viewerUserId ?? ''}`,
        })
        .from(review)
        .innerJoin(rating, and(eq(rating.userId, review.userId), eq(rating.themeId, review.themeId)))
        .innerJoin(user, eq(user.id, review.userId))
        .leftJoin(profile, eq(profile.userId, review.userId))
        // Private users' reviews are hidden (schema/social.ts).
        .where(and(eq(review.themeId, themeId), sql`coalesce(${profile.isPrivate}, false) = false`))
        .orderBy(desc(review.updatedAt)),
    ])

  const distribution = Array.from({ length: 10 }, (_, index) => {
    const score = index + 1
    return { score, count: distributionRows.find((row) => row.score === score)?.count ?? 0 }
  })
  const totalVotes = distribution.reduce((sum, bucket) => sum + bucket.count, 0)
  const scoreSum = distribution.reduce((sum, bucket) => sum + bucket.score * bucket.count, 0)
  const globalIndex = globalRanking.findIndex((rankedTheme) => rankedTheme.themeId === themeId)
  const seasonIndex = seasonRanking.findIndex((rankedTheme) => rankedTheme.themeId === themeId)

  return {
    theme: summary,
    artists,
    stats: {
      voteCount: totalVotes,
      averageScore: totalVotes === 0 ? null : scoreSum / totalVotes,
      weightedScore: globalIndex === -1 ? null : globalRanking[globalIndex].weightedScore,
      globalRank: globalIndex === -1 ? null : globalIndex + 1,
      seasonRank: seasonIndex === -1 ? null : seasonIndex + 1,
      minVotes: MIN_VOTES_GLOBAL,
      distribution,
    },
    viewer,
    followedScores,
    reviews,
  }
}

// `null` when the slug doesn't exist. Themes are OP/ED of the artist's songs, best rated first.
export async function findArtistDetail(database: Database, slug: string) {
  const artistRow = await database.query.artist.findFirst({ where: eq(artist.slug, slug) })
  if (!artistRow) return null

  const themes = await database
    .select({ ...themeSummaryColumns, voteCount, averageScore })
    .from(songArtist)
    .innerJoin(song, eq(song.id, songArtist.songId))
    .innerJoin(theme, eq(theme.songId, song.id))
    .innerJoin(anime, eq(anime.id, theme.animeId))
    .leftJoin(rating, eq(rating.themeId, theme.id))
    .where(and(eq(songArtist.artistId, artistRow.id), isRatedThemeType))
    .groupBy(theme.id, anime.id, song.id)
    .orderBy(sql`avg(${rating.score}) desc nulls last`, sql`${anime.year} desc nulls last`, asc(theme.id))

  return { artist: artistRow, themes }
}
