// Catalog — a local copy of AnimeThemes, written only by the importer (scripts/import/).
// The app never calls AnimeThemes at request time (decisions.md #1).
// Every table keeps the upstream id in `animethemesId` so re-imports upsert instead of duplicating.

import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const seasonEnum = pgEnum('season', ['WINTER', 'SPRING', 'SUMMER', 'FALL'])
export const themeTypeEnum = pgEnum('theme_type', ['OP', 'ED', 'IN'])

const timestamps = {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

export const anime = pgTable(
  'anime',
  {
    id: serial().primaryKey(),
    animethemesId: integer('animethemes_id').notNull(),
    slug: text().notNull(),
    titleRomaji: text('title_romaji').notNull(),
    titleEnglish: text('title_english'),
    titleNative: text('title_native'),
    format: text(),
    year: integer(),
    season: seasonEnum(),
    synopsis: text(),
    coverSmallUrl: text('cover_small_url'),
    coverLargeUrl: text('cover_large_url'),
    anilistId: integer('anilist_id'),
    malId: integer('mal_id'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('anime_animethemes_id_idx').on(table.animethemesId),
    uniqueIndex('anime_slug_idx').on(table.slug),
    index('anime_year_season_idx').on(table.year, table.season),
    index('anime_anilist_id_idx').on(table.anilistId),
  ],
)

export const artist = pgTable(
  'artist',
  {
    id: serial().primaryKey(),
    animethemesId: integer('animethemes_id').notNull(),
    slug: text().notNull(),
    name: text().notNull(),
    nameNative: text('name_native'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('artist_animethemes_id_idx').on(table.animethemesId),
    uniqueIndex('artist_slug_idx').on(table.slug),
  ],
)

export const song = pgTable(
  'song',
  {
    id: serial().primaryKey(),
    animethemesId: integer('animethemes_id').notNull(),
    titleRomaji: text('title_romaji'),
    titleNative: text('title_native'),
    ...timestamps,
  },
  (table) => [uniqueIndex('song_animethemes_id_idx').on(table.animethemesId)],
)

export const songArtist = pgTable(
  'song_artist',
  {
    songId: integer('song_id')
      .notNull()
      .references(() => song.id, { onDelete: 'cascade' }),
    artistId: integer('artist_id')
      .notNull()
      .references(() => artist.id, { onDelete: 'cascade' }),
    // Credited name for this song when it differs from the artist's (e.g. a character name).
    creditedAs: text('credited_as'),
  },
  (table) => [primaryKey({ columns: [table.songId, table.artistId] })],
)

// The rated thing. A theme is "OP2 of anime X", not the song: the same song can be the theme of
// two anime and each use is ranked separately (decisions.md #2).
export const theme = pgTable(
  'theme',
  {
    id: serial().primaryKey(),
    animethemesId: integer('animethemes_id').notNull(),
    animeId: integer('anime_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    songId: integer('song_id').references(() => song.id, { onDelete: 'set null' }),
    type: themeTypeEnum().notNull(),
    sequence: integer(),
    // AnimeThemes slug ("OP1", "ED2"); with the anime slug it builds the watch link.
    slug: text().notNull(),
    // From the AnimeThemes entries (versions): spoiler when every version is flagged, nsfw when any
    // is. The UI blurs flagged themes unless the viewer's settings say otherwise.
    spoiler: boolean().notNull().default(false),
    nsfw: boolean().notNull().default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('theme_animethemes_id_idx').on(table.animethemesId),
    index('theme_anime_id_idx').on(table.animeId),
  ],
)

export const animeRelations = relations(anime, ({ many }) => ({ themes: many(theme) }))

export const themeRelations = relations(theme, ({ one }) => ({
  anime: one(anime, { fields: [theme.animeId], references: [anime.id] }),
  song: one(song, { fields: [theme.songId], references: [song.id] }),
}))

export const songRelations = relations(song, ({ many }) => ({
  themes: many(theme),
  artists: many(songArtist),
}))

export const artistRelations = relations(artist, ({ many }) => ({ songs: many(songArtist) }))

export const songArtistRelations = relations(songArtist, ({ one }) => ({
  song: one(song, { fields: [songArtist.songId], references: [song.id] }),
  artist: one(artist, { fields: [songArtist.artistId], references: [artist.id] }),
}))
