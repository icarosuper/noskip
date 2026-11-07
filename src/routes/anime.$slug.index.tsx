import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Cover } from '#/components/Cover'
import { EmptyState } from '#/components/EmptyState'
import { sectionTitleClass } from '#/components/ui'
import { ThemeRow } from '#/features/catalog/components/ThemeItems'
import { SEASON_LABELS, THEME_TYPE_LABELS } from '#/features/catalog/constants'
import { getAnimeDetail } from '#/features/catalog/server'
import { ScorePicker } from '#/features/ratings/components/ScorePicker'
import { cn } from '#/lib/cn'

export const Route = createFileRoute('/anime/$slug/')({
  loader: ({ params }) => getAnimeDetail({ data: { slug: params.slug } }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.anime.titleEnglish ?? loaderData.anime.titleRomaji} · NoSkip`
          : 'NoSkip',
      },
    ],
  }),
  component: AnimePage,
})

type AnimeTheme = ReturnType<typeof Route.useLoaderData>['themes'][number]

function ThemeWithQuickRate({ theme, isSignedIn }: { theme: AnimeTheme; isSignedIn: boolean }) {
  const [isRating, setIsRating] = useState(false)
  const songName = theme.songTitle ?? theme.themeSlug

  return (
    <li>
      <ThemeRow
        theme={theme}
        aside={
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="font-display text-base font-bold">
                {theme.averageScore === null ? '—' : theme.averageScore.toFixed(1)}
              </span>
              <span className="text-[11px] text-muted">{theme.voteCount} votes</span>
            </div>
            {isSignedIn && (
              <button
                type="button"
                onClick={() => setIsRating((open) => !open)}
                aria-expanded={isRating}
                aria-label={
                  theme.myScore ? `Your score for ${songName}: ${theme.myScore}. Change` : `Rate ${songName}`
                }
                className={cn(
                  'flex h-11 min-w-11 items-center justify-center gap-0.5 rounded-xl px-2 text-sm font-bold',
                  theme.myScore
                    ? 'bg-accent text-accent-contrast'
                    : 'bg-surface-2 text-muted hover:text-text',
                )}
              >
                {theme.myScore ?? 'Rate'}
                <ChevronDown
                  aria-hidden="true"
                  className={cn('size-4 transition-transform', isRating && 'rotate-180')}
                />
              </button>
            )}
          </div>
        }
      />
      {isRating && (
        <div className="mt-1.5 rounded-2xl bg-surface p-2">
          <ScorePicker
            themeId={theme.themeId}
            currentScore={theme.myScore}
            label={`Your score for ${songName}`}
            onSaved={() => setIsRating(false)}
          />
        </div>
      )}
    </li>
  )
}

function AnimePage() {
  const { anime, themes } = Route.useLoaderData()
  const { currentUser } = Route.useRouteContext()
  const title = anime.titleEnglish ?? anime.titleRomaji
  const groups = (['OP', 'ED'] as const)
    .map((type) => ({ type, themes: themes.filter((theme) => theme.type === type) }))
    .filter((group) => group.themes.length > 0)

  return (
    <div className="space-y-6">
      <header className="flex gap-4">
        <Cover
          priority
          url={anime.coverLargeUrl}
          title={title}
          seed={anime.slug}
          className="h-40 w-28 shrink-0 rounded-2xl text-3xl sm:h-52 sm:w-36"
        />
        <div className="flex min-w-0 flex-col justify-end gap-1">
          <h1 className="font-display text-2xl leading-tight font-bold tracking-tight">{title}</h1>
          {anime.titleEnglish && <p className="text-sm text-muted">{anime.titleRomaji}</p>}
          <p className="text-sm text-muted">
            {anime.format}
            {anime.year && anime.season && (
              <>
                {anime.format && ' · '}
                <Link
                  to="/season/$year/$season"
                  params={{ year: String(anime.year), season: anime.season.toLowerCase() }}
                  className="font-semibold text-accent-text underline-offset-2 hover:underline"
                >
                  {SEASON_LABELS[anime.season]} {anime.year}
                </Link>
              </>
            )}
          </p>
          <a
            href={`https://animethemes.moe/anime/${anime.slug}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-accent-text"
          >
            AnimeThemes <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      </header>

      {anime.synopsis && <p className="line-clamp-4 text-sm leading-relaxed text-muted">{anime.synopsis}</p>}

      {!currentUser && (
        <p className="rounded-2xl bg-accent-soft px-4 py-3 text-sm">
          <Link to="/login" className="font-semibold text-accent-text underline">
            Sign in
          </Link>{' '}
          to rate these themes.
        </p>
      )}

      {groups.length === 0 && <EmptyState>No openings or endings catalogued for this anime.</EmptyState>}
      {/* Openings and endings side by side from `lg`. */}
      <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
        {groups.map((group) => (
          <section key={group.type} aria-labelledby={`${group.type}-heading`}>
            <h2 id={`${group.type}-heading`} className={cn(sectionTitleClass, 'mb-3')}>
              {THEME_TYPE_LABELS[group.type]}
            </h2>
            <ul className="space-y-1.5">
              {group.themes.map((theme) => (
                <ThemeWithQuickRate key={theme.themeId} theme={theme} isSignedIn={currentUser !== null} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
