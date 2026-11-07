import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { anime, artist, rating, song, songArtist, theme } from '#/db/schema'
import { ANIME_SLUG, buildFixtureCatalog, THEME } from '../../tests/fixtures/catalog'
import { seedUsers } from '../../tests/fixtures/seed'
import { FIXTURE_USERS } from '../../tests/fixtures/users'
import { setupTestDatabase } from '../../tests/support/integration'
import type { UpstreamAnime } from './animethemes-client'
import { upsertAnime } from './upsert'

const database = setupTestDatabase()

function findFixture(slug: string): UpstreamAnime {
  const fixture = buildFixtureCatalog().find((upstreamAnime) => upstreamAnime.slug === slug)
  if (!fixture) throw new Error(`no fixture anime ${slug}`)
  return structuredClone(fixture)
}

async function countRows() {
  const [animeCount, themeCount, songCount, artistCount, creditCount] = await Promise.all([
    database.$count(anime),
    database.$count(theme),
    database.$count(song),
    database.$count(artist),
    database.$count(songArtist),
  ])
  return { animeCount, themeCount, songCount, artistCount, creditCount }
}

describe('upsertAnime', () => {
  it('writes the anime with its themes, songs and artists', async () => {
    await upsertAnime(database, findFixture(ANIME_SLUG.starlight))

    const savedAnime = await database.query.anime.findFirst({ where: eq(anime.slug, ANIME_SLUG.starlight) })
    expect(savedAnime).toMatchObject({
      titleRomaji: 'Hoshizora Relay',
      titleEnglish: 'Starlight Relay',
      anilistId: 500001,
    })
    expect(await countRows()).toEqual({
      animeCount: 1,
      themeCount: 3,
      songCount: 3,
      artistCount: 2,
      creditCount: 4,
    })
  })

  it('is idempotent: importing twice creates no duplicates', async () => {
    for (const upstreamAnime of buildFixtureCatalog()) await upsertAnime(database, upstreamAnime)
    const afterFirstImport = await countRows()

    for (const upstreamAnime of buildFixtureCatalog()) await upsertAnime(database, upstreamAnime)

    expect(await countRows()).toEqual(afterFirstImport)
  })

  it('shares one song row between two anime that use the same song', async () => {
    await upsertAnime(database, findFixture(ANIME_SLUG.iron))
    await upsertAnime(database, findFixture(ANIME_SLUG.ironMovie))

    const ironOp2 = await database.query.theme.findFirst({ where: eq(theme.animethemesId, THEME.ironOp2) })
    const movieEd1 = await database.query.theme.findFirst({
      where: eq(theme.animethemesId, THEME.ironMovieEd1),
    })
    expect(ironOp2?.songId).toBeDefined()
    expect(movieEd1?.songId).toBe(ironOp2?.songId)
    expect(movieEd1?.id).not.toBe(ironOp2?.id)
  })

  it('updates changed upstream fields on re-import', async () => {
    await upsertAnime(database, findFixture(ANIME_SLUG.starlight))

    const renamed = findFixture(ANIME_SLUG.starlight)
    renamed.title.english = 'Starlight Relay (renamed)'
    renamed.animethemes[0].song = {
      ...renamed.animethemes[0].song!,
      title: { romaji: 'Run to the Stars (TV Size)', native: null },
    }
    await upsertAnime(database, renamed)

    const savedAnime = await database.query.anime.findFirst({ where: eq(anime.slug, ANIME_SLUG.starlight) })
    const savedSong = await database.query.song.findFirst({ where: eq(song.animethemesId, 7001) })
    expect(savedAnime?.titleEnglish).toBe('Starlight Relay (renamed)')
    expect(savedSong?.titleRomaji).toBe('Run to the Stars (TV Size)')
  })

  it('keeps a theme and its ratings when the theme disappears upstream (decisions.md #1)', async () => {
    await upsertAnime(database, findFixture(ANIME_SLUG.starlight))
    await seedUsers(database)
    const starlightOp1 = await database.query.theme.findFirst({
      where: eq(theme.animethemesId, THEME.starlightOp1),
    })
    await database
      .insert(rating)
      .values({ userId: FIXTURE_USERS.alice.id, themeId: starlightOp1!.id, score: 9 })

    const withoutOp1 = findFixture(ANIME_SLUG.starlight)
    withoutOp1.animethemes = withoutOp1.animethemes.filter(
      (upstreamTheme) => upstreamTheme.id !== THEME.starlightOp1,
    )
    await upsertAnime(database, withoutOp1)

    expect(await database.query.theme.findFirst({ where: eq(theme.id, starlightOp1!.id) })).toBeDefined()
    expect(await database.$count(rating)).toBe(1)
  })

  it('flags a theme as spoiler only when every version is, NSFW when any is', async () => {
    await upsertAnime(database, buildFixtureCatalog()[2])
    const upstream = buildFixtureCatalog()[2]
    upstream.animethemes[0].animethemeentries = [
      { spoiler: true, nsfw: false },
      { spoiler: false, nsfw: true },
    ]
    await upsertAnime(database, upstream)

    const ironOp1 = await database.query.theme.findFirst({ where: eq(theme.animethemesId, THEME.ironOp1) })
    const ironEd1 = await database.query.theme.findFirst({ where: eq(theme.animethemesId, THEME.ironEd1) })
    expect(ironOp1).toMatchObject({ spoiler: false, nsfw: true })
    expect(ironEd1).toMatchObject({ spoiler: true, nsfw: false })
  })

  it('stores a theme without a credited song', async () => {
    await upsertAnime(database, findFixture(ANIME_SLUG.kitchen))

    const kitchenEd = await database.query.theme.findFirst({
      where: eq(theme.animethemesId, THEME.kitchenEd1),
    })
    expect(kitchenEd).toMatchObject({ type: 'ED', songId: null })
  })
})
