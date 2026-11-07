import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { Cover } from '#/components/Cover'
import { sectionTitleClass } from '#/components/ui'
import { ScoreAside, ThemeCollection } from '#/features/catalog/components/ThemeItems'
import { currentSeason, SEASON_LABELS } from '#/features/catalog/constants'
import { getRanking, type RankedTheme } from '#/features/rankings/server'
import { cn } from '#/lib/cn'

export const Route = createFileRoute('/')({
  loader: async () => {
    const { year, season } = currentSeason()
    const [seasonTop, globalTop] = await Promise.all([
      getRanking({ data: { year, season, limit: 5 } }),
      getRanking({ data: { limit: 10 } }),
    ])
    return { year, season, seasonTop, globalTop }
  },
  component: Home,
})

function SectionHeader({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 id={id} className={sectionTitleClass}>
        {title}
      </h2>
      {children}
    </div>
  )
}

// Up to 5 distinct anime covers from the all-time top, skipping spoiler/NSFW themes (they'd be
// blurred everywhere else).
function bannerCovers(themes: RankedTheme[]) {
  const seenAnime = new Set<string>()
  const covers: { animeSlug: string; title: string; url: string | null }[] = []
  for (const theme of themes) {
    const isSensitive = theme.spoiler || theme.nsfw
    if (isSensitive || seenAnime.has(theme.animeSlug)) continue
    seenAnime.add(theme.animeSlug)
    covers.push({
      animeSlug: theme.animeSlug,
      title: theme.animeTitle,
      url: theme.coverLargeUrl ?? theme.coverUrl,
    })
  }
  return covers.slice(0, 5)
}

// Fanned covers, alternating tilt.
const COVER_TILTS = ['-rotate-6', 'rotate-3', '-rotate-2', 'rotate-6', '-rotate-3']

function WelcomeBanner({ covers }: { covers: ReturnType<typeof bannerCovers> }) {
  return (
    <section className="flex items-center gap-8 overflow-hidden rounded-3xl bg-surface p-5 sm:p-8 lg:px-12 lg:py-10">
      <div className="min-w-0 flex-1">
        <h1 className="max-w-xl font-display text-2xl font-bold tracking-tight sm:text-4xl">
          The best anime openings and endings, ranked by fans.
        </h1>
        <Link
          to="/login"
          className="mt-5 inline-flex h-12 items-center rounded-xl bg-accent px-6 font-bold text-accent-contrast hover:brightness-110"
        >
          Sign in to start rating
        </Link>
      </div>
      {covers.length > 0 && (
        <div aria-hidden="true" className="hidden shrink-0 items-center pr-4 lg:flex">
          {covers.map((cover, index) => (
            // Not `priority`: this row is hidden on phones, and an eager image downloads anyway.
            <Link
              key={cover.animeSlug}
              to="/anime/$slug"
              params={{ slug: cover.animeSlug }}
              tabIndex={-1}
              className={cn(
                'shrink-0 transition-transform hover:z-10 hover:-translate-y-1',
                index > 0 && '-ml-10',
                COVER_TILTS[index],
              )}
            >
              <Cover
                url={cover.url}
                title={cover.title}
                seed={cover.animeSlug}
                className="aspect-[3/4] w-28 rounded-xl text-xl shadow-xl ring-4 ring-surface xl:w-32"
              />
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

const seeAllClass = 'flex items-center text-sm font-semibold text-accent-text'

function Home() {
  const { year, season, seasonTop, globalTop } = Route.useLoaderData()
  const { currentUser } = Route.useRouteContext()
  const seasonName = `${SEASON_LABELS[season]} ${year}`

  return (
    <div className="space-y-8">
      {!currentUser && <WelcomeBanner covers={bannerCovers(globalTop)} />}

      <section aria-labelledby="season-heading" data-view-scope="home">
        <SectionHeader id="season-heading" title={`Top of ${seasonName}`}>
          <Link to="/rankings" search={{ year, season }} className={seeAllClass}>
            Ranking <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </SectionHeader>
        <ThemeCollection
          themes={seasonTop}
          view="saved"
          highlightFirst
          label={`${seasonName} ranking`}
          showRank
          emptyMessage="No ratings this season yet."
          renderAside={(theme, view) => (
            <ScoreAside score={theme.weightedScore} voteCount={theme.voteCount} view={view} />
          )}
        />
        <Link
          to="/season/$year/$season"
          params={{ year: String(year), season: season.toLowerCase() }}
          className="mt-3 flex h-11 items-center justify-center rounded-xl bg-surface text-sm font-semibold hover:bg-surface-2"
        >
          Browse {seasonName} anime
        </Link>
      </section>

      <section aria-labelledby="all-time-heading">
        <SectionHeader id="all-time-heading" title="All-time top">
          <Link to="/rankings" className={seeAllClass}>
            Ranking <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </SectionHeader>
        <ThemeCollection
          themes={globalTop}
          view="list"
          twoColumnList
          label="All-time ranking"
          showRank
          emptyMessage="No ratings yet."
          renderAside={(theme, view) => (
            <ScoreAside score={theme.weightedScore} voteCount={theme.voteCount} view={view} />
          )}
        />
      </section>
    </div>
  )
}
