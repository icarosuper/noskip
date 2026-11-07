import { describe, expect, it } from 'vitest'
import { type AnimePage, type ClientDependencies, createAnimeThemesClient } from './animethemes-client'

// A scripted fake AnimeThemes: each call returns the next response; requests are recorded.
// Typed fake instead of a mock library, so a change in the client's request shape is a type error.
function createFakeServer(responses: Response[]) {
  const requests: { variables: Record<string, unknown> }[] = []
  const fetchFn: ClientDependencies['fetchFn'] = async (_url, init) => {
    const body = JSON.parse(String(init.body)) as { variables: Record<string, unknown> }
    requests.push({ variables: body.variables })
    const nextResponse = responses.shift()
    if (!nextResponse) throw new Error('fake server: no more scripted responses')
    return nextResponse
  }
  return { fetchFn, requests }
}

// A clock that only moves when the client sleeps — no real waiting in tests.
function createFakeClock() {
  let currentTime = 0
  const sleeps: number[] = []
  return {
    sleeps,
    now: () => currentTime,
    sleep: async (milliseconds: number) => {
      sleeps.push(milliseconds)
      currentTime += milliseconds
    },
  }
}

function pageResponse(currentPage: number, hasMorePages: boolean): Response {
  const page: AnimePage = {
    paginatorInfo: {
      currentPage,
      lastPage: hasMorePages ? currentPage + 1 : currentPage,
      hasMorePages,
      total: 0,
    },
    data: [],
  }
  return Response.json({ data: { animePagination: page } })
}

async function collectPages(client: ReturnType<typeof createAnimeThemesClient>) {
  const pages: AnimePage[] = []
  for await (const page of client.fetchAnimePages({ year: 2025, season: 'FALL' })) pages.push(page)
  return pages
}

function createClient(responses: Response[]) {
  const server = createFakeServer(responses)
  const clock = createFakeClock()
  const client = createAnimeThemesClient({
    fetchFn: server.fetchFn,
    sleep: clock.sleep,
    now: clock.now,
    minIntervalMs: 750,
    log: () => {},
  })
  return { client, server, clock }
}

describe('createAnimeThemesClient', () => {
  it('follows pagination until hasMorePages is false, passing the filter on every page', async () => {
    const { client, server } = createClient([
      pageResponse(1, true),
      pageResponse(2, true),
      pageResponse(3, false),
    ])

    const pages = await collectPages(client)

    expect(pages.map((page) => page.paginatorInfo.currentPage)).toEqual([1, 2, 3])
    expect(server.requests.map((request) => request.variables)).toEqual([
      { page: 1, year: 2025, season: 'FALL' },
      { page: 2, year: 2025, season: 'FALL' },
      { page: 3, year: 2025, season: 'FALL' },
    ])
  })

  it('spaces requests by the minimum interval', async () => {
    const { client, clock } = createClient([pageResponse(1, true), pageResponse(2, false)])

    await collectPages(client)

    expect(clock.sleeps).toEqual([750])
  })

  it('retries a 429 after the Retry-After delay', async () => {
    const rateLimited = new Response('Too Many Attempts.', { status: 429, headers: { 'Retry-After': '60' } })
    const { client, clock } = createClient([rateLimited, pageResponse(1, false)])

    const pages = await collectPages(client)

    expect(pages).toHaveLength(1)
    expect(clock.sleeps).toContain(60_000)
  })

  it('retries a 5xx with exponential backoff', async () => {
    const unavailable = () => new Response('down', { status: 503 })
    const { client, clock } = createClient([unavailable(), unavailable(), pageResponse(1, false)])

    await collectPages(client)

    expect(clock.sleeps.filter((milliseconds) => milliseconds >= 1000)).toEqual([2000, 4000])
  })

  it('gives up after five failed attempts', async () => {
    const failures = Array.from({ length: 5 }, () => new Response('down', { status: 503 }))
    const { client } = createClient(failures)

    await expect(collectPages(client)).rejects.toThrow(/still failing after 5 retries/)
  })

  it('does not retry a GraphQL error returned with status 200', async () => {
    const complexityError = Response.json({ errors: [{ message: 'Max query complexity should be 10000' }] })
    const { client, server } = createClient([complexityError])

    await expect(collectPages(client)).rejects.toThrow(/Max query complexity/)
    expect(server.requests).toHaveLength(1)
  })

  it('fails on a non-retryable HTTP error', async () => {
    const { client } = createClient([new Response('bad query', { status: 400 })])

    await expect(collectPages(client)).rejects.toThrow(/answered 400/)
  })
})
