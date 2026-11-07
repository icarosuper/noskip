import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { z } from 'zod'
import { chipClass } from '#/components/ui'
import { ViewToggle } from '#/components/ViewToggle'
import { ScoreAside, ThemeCollection } from '#/features/catalog/components/ThemeItems'
import { RATED_THEME_TYPES, SEASON_LABELS, SEASONS } from '#/features/catalog/constants'
import { getRanking, getRankingYears } from '#/features/rankings/server'

// One page for every period: no year = all-time, a year, or a year + season. A season without a
// year is ignored (the season selector is disabled until a year is picked).
const searchSchema = z.object({
  year: z.number().int().optional(),
  season: z.enum(SEASONS).optional(),
  type: z.enum(RATED_THEME_TYPES).optional(),
})

export const Route = createFileRoute('/rankings')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({
    year: search.year,
    season: search.year === undefined ? undefined : search.season,
    type: search.type,
  }),
  loader: async ({ deps }) => {
    const [themes, years] = await Promise.all([
      getRanking({ data: { ...deps, limit: 100 } }),
      getRankingYears(),
    ])
    return { themes, years }
  },
  head: () => ({ meta: [{ title: 'Rankings · NoSkip' }] }),
  component: RankingsPage,
})

const selectClass =
  'h-10 w-full appearance-none rounded-xl border border-line bg-surface pr-9 pl-3 text-sm font-semibold text-text focus:border-accent focus:outline-none disabled:opacity-50'

function Select({
  label,
  value,
  disabled,
  onChange,
  children,
}: {
  label: string
  value: string
  disabled?: boolean
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <label className="relative min-w-0 flex-1 sm:w-40 sm:flex-none">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={selectClass}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
      />
    </label>
  )
}

function RankingsPage() {
  const { themes, years } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const season = search.year === undefined ? undefined : search.season

  const title =
    search.year === undefined
      ? 'All-time'
      : season
        ? `${SEASON_LABELS[season]} ${search.year}`
        : String(search.year)
  const typeOptions = [
    { value: undefined, label: 'OP + ED' },
    ...RATED_THEME_TYPES.map((value) => ({ value, label: value })),
  ]

  return (
    <div data-view-scope="rankings" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        <div className="flex">
          <ViewToggle scope="rankings" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex w-full gap-2 sm:w-auto">
          <Select
            label="Year"
            value={search.year === undefined ? '' : String(search.year)}
            onChange={(value) =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  year: value === '' ? undefined : Number(value),
                  season: value === '' ? undefined : prev.season,
                }),
              })
            }
          >
            <option value="">All years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
          <Select
            label="Season"
            value={season ?? ''}
            disabled={search.year === undefined}
            onChange={(value) =>
              navigate({
                search: (prev) => ({ ...prev, season: value === '' ? undefined : (value as typeof season) }),
              })
            }
          >
            <option value="">All seasons</option>
            {SEASONS.map((value) => (
              <option key={value} value={value}>
                {SEASON_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          {typeOptions.map((option) => (
            <Link
              key={option.label}
              to="."
              search={(prev) => ({ ...prev, type: option.value })}
              aria-current={search.type === option.value ? 'true' : undefined}
              className={chipClass(search.type === option.value)}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      <ThemeCollection
        themes={themes}
        view="saved"
        label="Ranking"
        showRank
        emptyMessage="No ratings in this period yet. Be the first to rate something!"
        renderAside={(theme, view) => (
          <ScoreAside score={theme.weightedScore} voteCount={theme.voteCount} view={view} />
        )}
      />
    </div>
  )
}
