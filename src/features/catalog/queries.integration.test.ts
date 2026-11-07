import { describe, expect, it } from 'vitest'
import { ANIME_SLUG } from '../../../tests/fixtures/catalog'
import { seedAll } from '../../../tests/fixtures/seed'
import { FIXTURE_USERS } from '../../../tests/fixtures/users'
import { setupTestDatabase } from '../../../tests/support/integration'
import { currentSeason } from './constants'
import { findAnimeDetail, findArtistDetail, findThemeDetail, listSeasonAnime, searchCatalog } from './queries'

const database = setupTestDatabase(seedAll)

describe('findAnimeDetail', () => {
  it('returns null for an unknown slug', async () => {
    expect(await findAnimeDetail(database, 'does_not_exist', null)).toBeNull()
  })

  it('lists openings then endings, without insert songs', async () => {
    const detail = await findAnimeDetail(database, ANIME_SLUG.starlight, null)

    expect(detail?.themes.map((animeTheme) => animeTheme.themeSlug)).toEqual(['OP1', 'ED1'])
    expect(detail?.themes[0]).toMatchObject({
      songTitle: 'Run to the Stars',
      artists: 'Aoi Band',
      voteCount: 2,
      averageScore: 9.5,
      myScore: null,
    })
  })

  it("fills myScore with the viewer's own score", async () => {
    const detail = await findAnimeDetail(database, ANIME_SLUG.starlight, FIXTURE_USERS.alice.id)

    expect(detail?.themes.map((animeTheme) => animeTheme.myScore)).toEqual([10, 8])
  })

  it('carries the spoiler and NSFW flags', async () => {
    const iron = await findAnimeDetail(database, ANIME_SLUG.iron, null)
    const kitchen = await findAnimeDetail(database, ANIME_SLUG.kitchen, null)

    expect(iron?.themes.find((animeTheme) => animeTheme.themeSlug === 'ED1')?.spoiler).toBe(true)
    expect(kitchen?.themes.find((animeTheme) => animeTheme.themeSlug === 'ED')?.nsfw).toBe(true)
  })
})

describe('searchCatalog', () => {
  it('matches anime by romaji or English title, case-insensitively', async () => {
    const byEnglish = await searchCatalog(database, 'iron petals')
    const byRomaji = await searchCatalog(database, 'hanabira')

    expect(byEnglish.anime.map((result) => result.slug)).toEqual([ANIME_SLUG.iron])
    expect(byRomaji.anime.map((result) => result.slug).sort()).toEqual(
      [ANIME_SLUG.iron, ANIME_SLUG.ironMovie].sort(),
    )
  })

  it('matches songs (openings and endings only) and artists', async () => {
    const results = await searchCatalog(database, 'launch')
    const byArtist = await searchCatalog(database, 'mika')

    // "Launch Day" is an insert song.
    expect(results.themes).toEqual([])
    expect(byArtist.artists.map((result) => result.name)).toEqual(['Mika Sato'])
    expect((await searchCatalog(database, 'rust and')).themes).toHaveLength(2)
  })

  it('treats % and _ as plain characters', async () => {
    expect((await searchCatalog(database, '%')).anime).toEqual([])
  })
})

describe('listSeasonAnime', () => {
  it('lists the anime of a season, sorted by title', async () => {
    const { year, season } = currentSeason()

    const seasonAnime = await listSeasonAnime(database, year, season)

    expect(seasonAnime.map((result) => result.slug)).toEqual([ANIME_SLUG.starlight, ANIME_SLUG.kitchen])
  })
})

describe('findThemeDetail', () => {
  it('returns null for an unknown theme or an insert song', async () => {
    expect(await findThemeDetail(database, ANIME_SLUG.starlight, 'OP9', null)).toBeNull()
    expect(await findThemeDetail(database, ANIME_SLUG.starlight, 'IN1', null)).toBeNull()
  })

  it('computes votes, mean, distribution and ranks', async () => {
    const detail = await findThemeDetail(database, ANIME_SLUG.starlight, 'OP1', null)

    expect(detail?.artists.map((themeArtist) => themeArtist.name)).toEqual(['Aoi Band'])
    expect(detail?.stats).toMatchObject({ voteCount: 2, averageScore: 9.5, globalRank: 1, seasonRank: 1 })
    expect(detail?.stats.distribution.filter((bucket) => bucket.count > 0)).toEqual([
      { score: 9, count: 1 },
      { score: 10, count: 1 },
    ])
    expect(detail?.viewer).toBeNull()
  })

  it("returns the viewer's score, review slot, top-10 position and followed users' scores", async () => {
    const detail = await findThemeDetail(database, ANIME_SLUG.starlight, 'OP1', FIXTURE_USERS.alice.id)

    expect(detail?.viewer).toEqual({ score: 10, reviewBody: null, favoritePosition: 1, favoriteCount: 3 })
    expect(detail?.followedScores).toEqual([{ username: 'bob', displayUsername: 'bob', score: 9 }])
  })

  it('lists reviews, hiding those of private profiles', async () => {
    const starlight = await findThemeDetail(database, ANIME_SLUG.starlight, 'OP1', null)
    const iron = await findThemeDetail(database, ANIME_SLUG.iron, 'ED1', null)

    expect(starlight?.reviews.map((themeReview) => themeReview.username)).toEqual(['bob'])
    // carol is private: her review exists but is not shown; her score still counts.
    expect(iron?.reviews).toEqual([])
    expect(iron?.stats.voteCount).toBe(1)
  })
})

describe('findArtistDetail', () => {
  it("lists the artist's openings and endings", async () => {
    const detail = await findArtistDetail(database, 'mika_sato')

    expect(detail?.themes.map((artistTheme) => artistTheme.songTitle).sort()).toEqual(
      ['Petal Rain', 'Quiet Orbit', 'Spice Spell'].sort(),
    )
    expect(await findArtistDetail(database, 'nobody')).toBeNull()
  })
})
