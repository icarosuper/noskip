// Fictional catalog in AnimeThemes' upstream shape, seeded through the real importer (upsertAnime),
// so every seed also exercises the import path. No network: covers are null on purpose.
//
// Two anime air in the *current* season (computed at seed time) so the home page and the season
// ranking always have data; the rest are in fixed past seasons.

import { currentSeason } from '#/features/catalog/constants'
import type { UpstreamAnime, UpstreamSong, UpstreamTheme } from '../../scripts/import/animethemes-client'

// Theme ids (AnimeThemes ids) — tests reference themes through these, never through serial ids.
export const THEME = {
  starlightOp1: 9001,
  starlightEd1: 9002,
  starlightIn1: 9003,
  kitchenOp1: 9011,
  kitchenEd1: 9012,
  ironOp1: 9021,
  ironOp2: 9022,
  ironEd1: 9023,
  ironMovieEd1: 9031,
} as const

export const ANIME_SLUG = {
  starlight: 'starlight_relay',
  kitchen: 'kitchen_witch_diaries',
  iron: 'iron_petals',
  ironMovie: 'iron_petals_the_movie',
} as const

function artist(id: number, name: string) {
  return { id, slug: name.toLowerCase().replaceAll(' ', '_'), name: { main: name, native: null } }
}

function song(id: number, title: string, artists: ReturnType<typeof artist>[]): UpstreamSong {
  return {
    id,
    title: { romaji: title, native: null },
    performances: artists.map((performer) => ({ as: null, artist: performer })),
  }
}

const aoiBand = artist(8001, 'Aoi Band')
const mikaSato = artist(8002, 'Mika Sato')
const rustline = artist(8003, 'Rustline')

// Used by two themes of two different anime: each use is rated separately (decisions.md #2).
const rustAndRoses = song(7006, 'Rust and Roses', [rustline])

// One unflagged version unless the test needs a spoiler/NSFW theme.
function animeTheme(
  fields: Omit<UpstreamTheme, 'animethemeentries'> & { spoiler?: boolean; nsfw?: boolean },
): UpstreamTheme {
  const { spoiler = false, nsfw = false, ...rest } = fields
  return { ...rest, animethemeentries: [{ spoiler, nsfw }] }
}

function anime(fields: Partial<UpstreamAnime> & Pick<UpstreamAnime, 'id' | 'slug' | 'title'>): UpstreamAnime {
  return {
    format: 'TV',
    year: null,
    season: null,
    synopsis: null,
    images: { nodes: [] },
    resources: { nodes: [] },
    animethemes: [],
    ...fields,
  }
}

export function buildFixtureCatalog(today = new Date()): UpstreamAnime[] {
  const { year, season } = currentSeason(today)

  return [
    anime({
      id: 1001,
      slug: ANIME_SLUG.starlight,
      title: { romaji: 'Hoshizora Relay', english: 'Starlight Relay', native: null },
      year,
      season,
      synopsis: 'Four sprinters, one baton, and a meteor shower.',
      resources: { nodes: [{ site: 'ANILIST', externalId: 500001 }] },
      animethemes: [
        animeTheme({
          id: THEME.starlightOp1,
          type: 'OP',
          sequence: 1,
          slug: 'OP1',
          song: song(7001, 'Run to the Stars', [aoiBand]),
        }),
        animeTheme({
          id: THEME.starlightEd1,
          type: 'ED',
          sequence: 1,
          slug: 'ED1',
          song: song(7002, 'Quiet Orbit', [mikaSato]),
        }),
        animeTheme({
          id: THEME.starlightIn1,
          type: 'IN',
          sequence: 1,
          slug: 'IN1',
          song: song(7003, 'Launch Day', [aoiBand, mikaSato]),
        }),
      ],
    }),
    anime({
      id: 1002,
      slug: ANIME_SLUG.kitchen,
      title: { romaji: 'Majo no Daidokoro Nikki', english: 'Kitchen Witch Diaries', native: null },
      year,
      season,
      animethemes: [
        animeTheme({
          id: THEME.kitchenOp1,
          type: 'OP',
          sequence: null,
          slug: 'OP',
          song: song(7004, 'Spice Spell', [mikaSato]),
        }),
        // A theme with no song credited upstream.
        animeTheme({ id: THEME.kitchenEd1, type: 'ED', sequence: null, slug: 'ED', song: null, nsfw: true }),
      ],
    }),
    anime({
      id: 1003,
      slug: ANIME_SLUG.iron,
      title: { romaji: 'Tetsu no Hanabira', english: 'Iron Petals', native: null },
      year: 2024,
      season: 'SPRING',
      animethemes: [
        animeTheme({
          id: THEME.ironOp1,
          type: 'OP',
          sequence: 1,
          slug: 'OP1',
          song: song(7005, 'Forged Bloom', [rustline]),
        }),
        animeTheme({ id: THEME.ironOp2, type: 'OP', sequence: 2, slug: 'OP2', song: rustAndRoses }),
        animeTheme({
          id: THEME.ironEd1,
          type: 'ED',
          sequence: 1,
          slug: 'ED1',
          song: song(7007, 'Petal Rain', [mikaSato]),
          spoiler: true,
        }),
      ],
    }),
    anime({
      id: 1004,
      slug: ANIME_SLUG.ironMovie,
      title: { romaji: 'Tetsu no Hanabira Gekijouban', english: null, native: null },
      format: 'MOVIE',
      year: 2024,
      season: 'SUMMER',
      animethemes: [
        animeTheme({ id: THEME.ironMovieEd1, type: 'ED', sequence: 1, slug: 'ED1', song: rustAndRoses }),
      ],
    }),
  ]
}
