import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { z } from 'zod'
import { Avatar } from '#/components/Avatar'
import { EmptyState } from '#/components/EmptyState'
import { chipClass, sectionTitleClass } from '#/components/ui'
import { AnimeCollection } from '#/features/catalog/components/AnimeCollection'
import { ThemeCollection } from '#/features/catalog/components/ThemeItems'
import { search } from '#/features/catalog/server'
import { cn } from '#/lib/cn'

const MIN_QUERY_LENGTH = 2
const KINDS = ['all', 'anime', 'songs', 'artists'] as const
type Kind = (typeof KINDS)[number]

export const Route = createFileRoute('/search')({
  validateSearch: z.object({ q: z.string().optional(), kind: z.enum(KINDS).optional() }),
  loaderDeps: ({ search: params }) => ({ query: params.q?.trim() ?? '' }),
  loader: ({ deps }) => {
    const isQueryTooShort = deps.query.length < MIN_QUERY_LENGTH
    if (isQueryTooShort) return null
    return search({ data: { query: deps.query } })
  },
  head: () => ({ meta: [{ title: 'Search · NoSkip' }] }),
  component: SearchPage,
})

const KIND_LABELS: Record<Kind, string> = { all: 'All', anime: 'Anime', songs: 'Songs', artists: 'Artists' }

function SearchPage() {
  const results = Route.useLoaderData()
  const { q, kind = 'all' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = String(new FormData(event.currentTarget).get('q') ?? '')
    navigate({ search: (prev) => ({ ...prev, q: query }) })
  }

  const shows = (section: Kind) => kind === 'all' || kind === section
  const isEmpty = results && results.anime.length + results.themes.length + results.artists.length === 0

  return (
    <div className="space-y-5">
      <search>
        <form onSubmit={handleSubmit} className="relative">
          <Search aria-hidden="true" className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
          <input
            name="q"
            type="search"
            aria-label="Search anime, songs and artists"
            defaultValue={q}
            placeholder="Anime, song or artist…"
            className="h-12 w-full rounded-2xl border border-line bg-surface pr-4 pl-12 text-text placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </form>
      </search>

      {results && (
        <div className="flex gap-2">
          {KINDS.map((value) => (
            <Link
              key={value}
              to="."
              search={(prev) => ({ ...prev, kind: value === 'all' ? undefined : value })}
              aria-current={kind === value ? 'true' : undefined}
              className={chipClass(kind === value)}
            >
              {KIND_LABELS[value]}
            </Link>
          ))}
        </div>
      )}

      {!results && <p className="text-sm text-muted">Type at least {MIN_QUERY_LENGTH} letters.</p>}
      {isEmpty && <EmptyState>Nothing found for “{q}”.</EmptyState>}

      {results && shows('anime') && results.anime.length > 0 && (
        <section aria-labelledby="anime-results" className="space-y-3">
          <h2 id="anime-results" className={sectionTitleClass}>
            Anime
          </h2>
          <AnimeCollection animeList={results.anime} view="list" label="Anime results" emptyMessage="" />
        </section>
      )}
      {results && shows('songs') && results.themes.length > 0 && (
        <section aria-labelledby="song-results" className="space-y-3">
          <h2 id="song-results" className={sectionTitleClass}>
            Songs
          </h2>
          <ThemeCollection themes={results.themes} view="list" label="Song results" emptyMessage="" />
        </section>
      )}
      {results && shows('artists') && results.artists.length > 0 && (
        <section aria-labelledby="artist-results" className="space-y-3">
          <h2 id="artist-results" className={sectionTitleClass}>
            Artists
          </h2>
          <ul aria-label="Artist results" className="space-y-1.5">
            {results.artists.map((artist) => (
              <li key={artist.slug}>
                <Link
                  to="/artist/$slug"
                  params={{ slug: artist.slug }}
                  className={cn('flex items-center gap-3 rounded-2xl bg-surface p-2 pr-3 hover:bg-surface-2')}
                >
                  <Avatar image={null} name={artist.name} className="size-12 text-lg" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{artist.name}</p>
                    {artist.nameNative && (
                      <p className="truncate text-[13px] text-muted">{artist.nameNative}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
