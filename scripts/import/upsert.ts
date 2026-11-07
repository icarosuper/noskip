// Writes one upstream anime (with its themes, songs and artists) into the catalog tables.
// Upsert by `animethemes_id` everywhere; never deletes (decisions.md #1).

import { getTableColumns, sql } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import type { Database } from '#/db/client'
import { anime, artist, song, songArtist, theme } from '#/db/schema'
import type { UpstreamAnime } from './animethemes-client'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

function findImage(upstream: UpstreamAnime, facet: string) {
  return upstream.images.nodes.find((image) => image.facet === facet)?.link ?? null
}

function findExternalId(upstream: UpstreamAnime, site: string) {
  return upstream.resources.nodes.find((resource) => resource.site === site)?.externalId ?? null
}

// `excluded.*` = the row we tried to insert; keeps upserts to one statement per table.
// Keys are the TS field names — Drizzle silently ignores keys that are not fields of the table.
function updateFromExcluded<TTable extends PgTable>(table: TTable, fields: (keyof TTable['_']['columns'])[]) {
  const columns = getTableColumns(table)
  return Object.fromEntries(
    fields.map((field) => [field, sql.raw(`excluded."${columns[field as string].name}"`)]),
  )
}

async function upsertAnimeRow(transaction: Transaction, upstream: UpstreamAnime) {
  const [animeRow] = await transaction
    .insert(anime)
    .values({
      animethemesId: upstream.id,
      slug: upstream.slug,
      titleRomaji: upstream.title.romaji,
      titleEnglish: upstream.title.english,
      titleNative: upstream.title.native,
      format: upstream.format,
      year: upstream.year,
      season: upstream.season,
      synopsis: upstream.synopsis,
      coverSmallUrl: findImage(upstream, 'SMALL_COVER'),
      coverLargeUrl: findImage(upstream, 'LARGE_COVER'),
      anilistId: findExternalId(upstream, 'ANILIST'),
      malId: findExternalId(upstream, 'MAL'),
    })
    .onConflictDoUpdate({
      target: anime.animethemesId,
      set: {
        ...updateFromExcluded(anime, [
          'slug',
          'titleRomaji',
          'titleEnglish',
          'titleNative',
          'format',
          'year',
          'season',
          'synopsis',
          'coverSmallUrl',
          'coverLargeUrl',
          'anilistId',
          'malId',
        ]),
        updatedAt: new Date(),
      },
    })
    .returning({ id: anime.id })
  return animeRow.id
}

async function upsertSongWithArtists(
  transaction: Transaction,
  upstreamSong: NonNullable<UpstreamAnime['animethemes'][number]['song']>,
) {
  const [songRow] = await transaction
    .insert(song)
    .values({
      animethemesId: upstreamSong.id,
      titleRomaji: upstreamSong.title.romaji,
      titleNative: upstreamSong.title.native,
    })
    .onConflictDoUpdate({
      target: song.animethemesId,
      set: { ...updateFromExcluded(song, ['titleRomaji', 'titleNative']), updatedAt: new Date() },
    })
    .returning({ id: song.id })

  for (const performance of upstreamSong.performances) {
    const [artistRow] = await transaction
      .insert(artist)
      .values({
        animethemesId: performance.artist.id,
        slug: performance.artist.slug,
        name: performance.artist.name.main,
        nameNative: performance.artist.name.native,
      })
      .onConflictDoUpdate({
        target: artist.animethemesId,
        set: { ...updateFromExcluded(artist, ['slug', 'name', 'nameNative']), updatedAt: new Date() },
      })
      .returning({ id: artist.id })

    await transaction
      .insert(songArtist)
      .values({ songId: songRow.id, artistId: artistRow.id, creditedAs: performance.as })
      .onConflictDoUpdate({
        target: [songArtist.songId, songArtist.artistId],
        set: updateFromExcluded(songArtist, ['creditedAs']),
      })
  }

  return songRow.id
}

export async function upsertAnime(database: Database, upstream: UpstreamAnime) {
  await database.transaction(async (transaction) => {
    const animeId = await upsertAnimeRow(transaction, upstream)

    for (const upstreamTheme of upstream.animethemes) {
      const entries = upstreamTheme.animethemeentries
      const spoiler = entries.length > 0 && entries.every((entry) => entry.spoiler)
      const nsfw = entries.some((entry) => entry.nsfw)
      const songId = upstreamTheme.song ? await upsertSongWithArtists(transaction, upstreamTheme.song) : null

      await transaction
        .insert(theme)
        .values({
          animethemesId: upstreamTheme.id,
          animeId,
          songId,
          type: upstreamTheme.type,
          sequence: upstreamTheme.sequence,
          slug: upstreamTheme.slug,
          spoiler,
          nsfw,
        })
        .onConflictDoUpdate({
          target: theme.animethemesId,
          set: {
            ...updateFromExcluded(theme, [
              'animeId',
              'songId',
              'type',
              'sequence',
              'slug',
              'spoiler',
              'nsfw',
            ]),
            updatedAt: new Date(),
          },
        })
    }
  })
}
