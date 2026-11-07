import { inArray, sql } from 'drizzle-orm'
import { anime, song, theme } from '#/db/schema'
import { RATED_THEME_TYPES } from './constants'

// Columns every theme row in the UI needs (lists, rankings, profile). Select them with
// `.from(theme).innerJoin(anime, …).leftJoin(song, …)`.
//
// `artists` is a correlated subquery, not a join: joining song_artist would multiply the rating
// rows of a song with several artists.
export const themeSummaryColumns = {
  themeId: theme.id,
  themeSlug: theme.slug,
  type: theme.type,
  spoiler: theme.spoiler,
  nsfw: theme.nsfw,
  animeSlug: anime.slug,
  animeTitle: sql<string>`coalesce(${anime.titleEnglish}, ${anime.titleRomaji})`,
  coverUrl: anime.coverSmallUrl,
  coverLargeUrl: anime.coverLargeUrl,
  songTitle: song.titleRomaji,
  artists: sql<string | null>`(
    select string_agg(coalesce(sa.credited_as, a.name), ', ' order by a.name)
    from song_artist sa join artist a on a.id = sa.artist_id
    where sa.song_id = ${theme.songId}
  )`,
}

export interface ThemeSummary {
  themeId: number
  themeSlug: string
  type: 'OP' | 'ED' | 'IN'
  spoiler: boolean
  nsfw: boolean
  animeSlug: string
  animeTitle: string
  coverUrl: string | null
  coverLargeUrl: string | null
  songTitle: string | null
  artists: string | null
}

export const isRatedThemeType = inArray(theme.type, [...RATED_THEME_TYPES])
