import { and, eq, sql } from 'drizzle-orm'
import type { Database } from '#/db/client'
import { anime, rating, song, theme } from '#/db/schema'
import type { RatedThemeType, Season } from '#/features/catalog/constants'
import { isRatedThemeType, type ThemeSummary, themeSummaryColumns } from '#/features/catalog/theme-summary'
import { MIN_VOTES_GLOBAL, MIN_VOTES_SEASON } from './bayesian'

// No year → all-time. Year only → that year. Year + season → that season.
export interface RankingFilter {
  type?: RatedThemeType
  year?: number
  season?: Season
  limit: number
}

export interface RankedTheme extends ThemeSummary {
  voteCount: number
  averageScore: number
  weightedScore: number
}

export async function queryRanking(database: Database, filter: RankingFilter): Promise<RankedTheme[]> {
  const isScopedRanking = filter.year !== undefined
  const minVotes = isScopedRanking ? MIN_VOTES_SEASON : MIN_VOTES_GLOBAL

  const scopeConditions = and(
    isRatedThemeType,
    filter.type ? eq(theme.type, filter.type) : undefined,
    filter.year !== undefined ? eq(anime.year, filter.year) : undefined,
    filter.season ? eq(anime.season, filter.season) : undefined,
  )

  // The prior is the mean of the same scope (a season is compared with its own season).
  const [{ value: meanScore }] = await database
    .select({ value: sql<number>`coalesce(avg(${rating.score}), 0)`.mapWith(Number) })
    .from(rating)
    .innerJoin(theme, eq(theme.id, rating.themeId))
    .innerJoin(anime, eq(anime.id, theme.animeId))
    .where(scopeConditions)

  // Same formula as bayesianAverage() in bayesian.ts.
  const voteCount = sql<number>`count(${rating.score})`.mapWith(Number)
  const averageScore = sql<number>`avg(${rating.score})`.mapWith(Number)
  const weightedScore = sql<number>`
    (count(${rating.score}) * avg(${rating.score}) + ${minVotes} * ${meanScore}::numeric)
    / (count(${rating.score}) + ${minVotes})`.mapWith(Number)

  return database
    .select({ ...themeSummaryColumns, voteCount, averageScore, weightedScore })
    .from(rating)
    .innerJoin(theme, eq(theme.id, rating.themeId))
    .innerJoin(anime, eq(anime.id, theme.animeId))
    .leftJoin(song, eq(song.id, theme.songId))
    .where(scopeConditions)
    .groupBy(theme.id, anime.id, song.id)
    .orderBy(sql`${weightedScore} desc`, sql`${voteCount} desc`, theme.id)
    .limit(filter.limit)
}

// Years that have catalogued anime, newest first — the ranking page's year selector.
export async function listCatalogYears(database: Database) {
  const rows = await database
    .selectDistinct({ year: anime.year })
    .from(anime)
    .where(sql`${anime.year} is not null`)
    .orderBy(sql`${anime.year} desc`)
  return rows.map((row) => row.year as number)
}
