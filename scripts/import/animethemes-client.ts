// Thin GraphQL client for https://graphql.animethemes.moe — used only by the importer.
// Limits (docs: api-docs.animethemes.moe/graphql/intro/ratelimiting): 90 requests/minute,
// query depth 13, complexity 10000. The REST/JSON:API is deprecated upstream; do not use it.

import { z } from 'zod'

const ENDPOINT = 'https://graphql.animethemes.moe/'
const USER_AGENT = 'noskip-importer/0.1'
// 90/min allowed; stay under it so a parallel manual request doesn't trip a 429.
const DEFAULT_MIN_INTERVAL_MS = 750
const MAX_RETRIES = 5

export type Season = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL'
export type ThemeType = 'OP' | 'ED' | 'IN'

export interface UpstreamArtist {
  id: number
  slug: string
  name: { main: string; native: string | null }
}

export interface UpstreamSong {
  id: number
  title: { romaji: string | null; native: string | null }
  performances: { as: string | null; artist: UpstreamArtist }[]
}

export interface UpstreamTheme {
  id: number
  type: ThemeType
  sequence: number | null
  slug: string
  song: UpstreamSong | null
  animethemeentries: { spoiler: boolean; nsfw: boolean }[]
}

export interface UpstreamAnime {
  id: number
  slug: string
  format: string | null
  year: number | null
  season: Season | null
  synopsis: string | null
  title: { romaji: string; english: string | null; native: string | null }
  images: { nodes: { facet: string; link: string }[] }
  resources: { nodes: { site: string; externalId: number | null }[] }
  animethemes: UpstreamTheme[]
}

export interface AnimePage {
  paginatorInfo: { currentPage: number; lastPage: number; hasMorePages: boolean; total: number }
  data: UpstreamAnime[]
}

// Every page is checked against this before anything is written: if AnimeThemes changes a field,
// the import stops with a message naming it instead of writing nulls or wrong types. Recorded
// sample: fixtures/anime-page.sample.json (animethemes-contract.test.ts).
const nullableString = z.string().nullable()

const upstreamArtistSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: z.object({ main: z.string(), native: nullableString }),
}) satisfies z.ZodType<UpstreamArtist>

const upstreamThemeSchema = z.object({
  id: z.number().int(),
  type: z.enum(['OP', 'ED', 'IN']),
  sequence: z.number().int().nullable(),
  slug: z.string(),
  song: z
    .object({
      id: z.number().int(),
      title: z.object({ romaji: nullableString, native: nullableString }),
      performances: z.array(z.object({ as: nullableString, artist: upstreamArtistSchema })),
    })
    .nullable(),
  animethemeentries: z.array(z.object({ spoiler: z.boolean(), nsfw: z.boolean() })),
}) satisfies z.ZodType<UpstreamTheme>

export const animePageSchema = z.object({
  paginatorInfo: z.object({
    currentPage: z.number().int(),
    lastPage: z.number().int(),
    hasMorePages: z.boolean(),
    total: z.number().int(),
  }),
  data: z.array(
    z.object({
      id: z.number().int(),
      slug: z.string(),
      format: nullableString,
      year: z.number().int().nullable(),
      season: z.enum(['WINTER', 'SPRING', 'SUMMER', 'FALL']).nullable(),
      synopsis: nullableString,
      title: z.object({ romaji: z.string(), english: nullableString, native: nullableString }),
      images: z.object({ nodes: z.array(z.object({ facet: z.string(), link: z.string() })) }),
      resources: z.object({
        nodes: z.array(z.object({ site: z.string(), externalId: z.number().int().nullable() })),
      }),
      animethemes: z.array(upstreamThemeSchema),
    }),
  ),
}) satisfies z.ZodType<AnimePage>

export function parseAnimePage(page: unknown): AnimePage {
  const parsed = animePageSchema.safeParse(page)
  if (!parsed.success) {
    throw new Error(`AnimeThemes changed the shape of animePagination:\n${z.prettifyError(parsed.error)}`)
  }
  return parsed.data
}

export interface AnimeFilter {
  year?: number
  season?: Season
}

const ANIME_PAGE_QUERY = /* GraphQL */ `
  query AnimePage($page: Int, $year: Int, $season: AnimeSeason) {
    animePagination(first: 25, page: $page, year: $year, season: $season, sort: [ID]) {
      paginatorInfo { currentPage lastPage hasMorePages total }
      data {
        id slug format year season synopsis
        title { romaji english native }
        images(first: 10) { nodes { facet link } }
        resources(first: 30) { nodes { site externalId } }
        animethemes {
          id type sequence slug
          animethemeentries { spoiler nsfw }
          song {
            id
            title { romaji native }
            performances { as artist { id slug name { main native } } }
          }
        }
      }
    }
  }
`

// Injected so unit tests run with a fake server and no real waiting.
export interface ClientDependencies {
  fetchFn: (url: string, init: RequestInit) => Promise<Response>
  sleep: (milliseconds: number) => Promise<void>
  now: () => number
  minIntervalMs: number
  log: (message: string) => void
}

const defaultDependencies: ClientDependencies = {
  fetchFn: (url, init) => fetch(url, init),
  sleep: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  now: () => Date.now(),
  minIntervalMs: DEFAULT_MIN_INTERVAL_MS,
  log: (message) => console.warn(message),
}

export function createAnimeThemesClient(overrides: Partial<ClientDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides }
  let lastRequestAt = Number.NEGATIVE_INFINITY

  async function waitForRateLimitSlot() {
    const elapsedMs = dependencies.now() - lastRequestAt
    const remainingMs = dependencies.minIntervalMs - elapsedMs
    if (remainingMs > 0) await dependencies.sleep(remainingMs)
    lastRequestAt = dependencies.now()
  }

  async function postQuery<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      await waitForRateLimitSlot()
      const response = await dependencies.fetchFn(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
        body: JSON.stringify({ query, variables }),
      })

      const isRetryable = response.status === 429 || response.status >= 500
      if (isRetryable) {
        const retryAfterSeconds = Number(response.headers.get('retry-after') ?? 0)
        const backoffMs = Math.max(retryAfterSeconds * 1000, 2 ** attempt * 1000)
        dependencies.log(
          `AnimeThemes answered ${response.status}; retry ${attempt}/${MAX_RETRIES} in ${backoffMs}ms`,
        )
        await dependencies.sleep(backoffMs)
        continue
      }
      if (!response.ok) throw new Error(`AnimeThemes answered ${response.status}: ${await response.text()}`)

      const body = (await response.json()) as { data?: T; errors?: { message: string }[] }
      // Depth/complexity errors come back as 200 with `errors` — never retry those.
      const graphQlErrors = body.errors ?? []
      if (graphQlErrors.length > 0) {
        throw new Error(
          `AnimeThemes GraphQL error: ${graphQlErrors.map((error) => error.message).join('; ')}`,
        )
      }
      if (!body.data) throw new Error('AnimeThemes returned no data')
      return body.data
    }
    throw new Error(`AnimeThemes still failing after ${MAX_RETRIES} retries`)
  }

  async function* fetchAnimePages(filter: AnimeFilter): AsyncGenerator<AnimePage> {
    let page = 1
    while (true) {
      const result = await postQuery<{ animePagination: unknown }>(ANIME_PAGE_QUERY, { page, ...filter })
      const animePage = parseAnimePage(result.animePagination)
      yield animePage
      if (!animePage.paginatorInfo.hasMorePages) return
      page++
    }
  }

  return { fetchAnimePages }
}
