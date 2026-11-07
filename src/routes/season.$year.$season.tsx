import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ViewToggle } from '#/components/ViewToggle'
import { AnimeCollection } from '#/features/catalog/components/AnimeCollection'
import { SEASON_LABELS, SEASONS, type Season } from '#/features/catalog/constants'
import { getSeasonAnime } from '#/features/catalog/server'

// URL uses lowercase seasons (/season/2025/fall); the DB enum is uppercase.
function parseSeasonParams(params: { year: string; season: string }) {
  const year = Number(params.year)
  const season = params.season.toUpperCase() as Season
  const isValid = Number.isInteger(year) && SEASONS.includes(season)
  if (!isValid) throw notFound()
  return { year, season }
}

function stepSeason(year: number, season: Season, step: -1 | 1) {
  const index = SEASONS.indexOf(season) + step
  if (index < 0) return { year: year - 1, season: SEASONS[SEASONS.length - 1] }
  if (index >= SEASONS.length) return { year: year + 1, season: SEASONS[0] }
  return { year, season: SEASONS[index] }
}

export const Route = createFileRoute('/season/$year/$season')({
  loader: async ({ params }) => {
    const { year, season } = parseSeasonParams(params)
    const animeList = await getSeasonAnime({ data: { year, season } })
    return { year, season, animeList }
  },
  component: SeasonPage,
})

function SeasonLink({ year, season, step }: { year: number; season: Season; step: -1 | 1 }) {
  const target = stepSeason(year, season, step)
  const Icon = step === -1 ? ChevronLeft : ChevronRight
  return (
    <Link
      to="/season/$year/$season"
      params={{ year: String(target.year), season: target.season.toLowerCase() }}
      aria-label={`${SEASON_LABELS[target.season]} ${target.year}`}
      className="flex size-9 items-center justify-center rounded-xl bg-surface text-muted hover:text-text"
    >
      <Icon aria-hidden="true" className="size-5" />
    </Link>
  )
}

function SeasonPage() {
  const { year, season, animeList } = Route.useLoaderData()

  return (
    <div data-view-scope="season" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SeasonLink year={year} season={season} step={-1} />
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {SEASON_LABELS[season]} {year}
          </h1>
          <SeasonLink year={year} season={season} step={1} />
        </div>
        <div className="flex">
          <ViewToggle scope="season" />
        </div>
      </div>
      <Link
        to="/rankings"
        search={{ year, season }}
        className="flex h-11 items-center justify-center rounded-xl bg-accent-soft text-sm font-semibold text-accent-text"
      >
        See this season's ranking
      </Link>
      <AnimeCollection
        animeList={animeList}
        view="saved"
        label={`Anime of ${SEASON_LABELS[season]} ${year}`}
        emptyMessage="No anime catalogued for this season."
      />
    </div>
  )
}
