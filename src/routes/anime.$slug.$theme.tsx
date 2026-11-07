import { createFileRoute, Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { Avatar } from '#/components/Avatar'
import { Cover } from '#/components/Cover'
import { sectionTitleClass } from '#/components/ui'
import { useSensitiveTheme } from '#/features/catalog/components/useSensitiveTheme'
import { animeThemesWatchUrl, SEASON_LABELS, THEME_TYPE_SINGULAR } from '#/features/catalog/constants'
import type { findThemeDetail } from '#/features/catalog/queries'
import { getThemeDetail } from '#/features/catalog/server'
import { FavoriteButton } from '#/features/ratings/components/FavoriteButton'
import { ReportButton } from '#/features/ratings/components/ReportButton'
import { ReviewForm } from '#/features/ratings/components/ReviewForm'
import { ScorePicker } from '#/features/ratings/components/ScorePicker'
import { cn } from '#/lib/cn'

export const Route = createFileRoute('/anime/$slug/$theme')({
  loader: ({ params }) => getThemeDetail({ data: { animeSlug: params.slug, themeSlug: params.theme } }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.theme.songTitle ?? loaderData.theme.themeSlug} · ${loaderData.theme.animeTitle} · NoSkip`
          : 'NoSkip',
      },
    ],
  }),
  component: ThemePage,
})

type ThemeDetail = NonNullable<Awaited<ReturnType<typeof findThemeDetail>>>

const cardClass = 'rounded-2xl bg-surface p-3'
const cardLabelClass = 'text-[11px] font-semibold tracking-wide text-muted uppercase'

function StatCards({ detail }: { detail: ThemeDetail }) {
  const { stats, theme, viewer } = detail
  const seasonName =
    theme.animeSeason && theme.animeYear ? `${SEASON_LABELS[theme.animeSeason]} ${theme.animeYear}` : null

  return (
    <div className="flex gap-2">
      <div className={cn(cardClass, 'flex-1')}>
        <p className={cardLabelClass}>Score</p>
        <p className="font-display text-3xl font-bold text-accent-text">
          {stats.weightedScore === null ? '—' : stats.weightedScore.toFixed(2)}
        </p>
        <p className="text-[11px] text-muted">
          {stats.globalRank ? `#${stats.globalRank} all-time` : 'Not ranked yet'}
          {stats.seasonRank && seasonName ? ` · #${stats.seasonRank} ${seasonName}` : ''}
        </p>
      </div>
      <div className={cn(cardClass, 'flex-1')}>
        <p className={cardLabelClass}>Mean</p>
        <p className="font-display text-3xl font-bold">
          {stats.averageScore === null ? '—' : stats.averageScore.toFixed(1)}
        </p>
        <p className="text-[11px] text-muted">
          {stats.voteCount} {stats.voteCount === 1 ? 'vote' : 'votes'}
        </p>
      </div>
      {viewer && (
        <FavoriteButton
          themeId={theme.themeId}
          position={viewer.favoritePosition}
          favoriteCount={viewer.favoriteCount}
        />
      )}
    </div>
  )
}

function Distribution({ distribution }: { distribution: ThemeDetail['stats']['distribution'] }) {
  const maxCount = Math.max(1, ...distribution.map((bucket) => bucket.count))
  return (
    <section aria-labelledby="distribution-heading" className={cardClass}>
      <h2 id="distribution-heading" className="mb-2 text-sm font-semibold">
        Distribution
      </h2>
      <ul className="space-y-1">
        {[...distribution].reverse().map((bucket) => (
          <li key={bucket.score} className="flex items-center gap-2 text-xs text-muted">
            <span className="w-5 text-right font-semibold">{bucket.score}</span>
            <div className="h-1.5 flex-1 rounded-full bg-surface-2">
              <div
                className="h-1.5 rounded-full bg-accent"
                style={{ width: `${(bucket.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right">{bucket.count}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ThemePage() {
  const detail = Route.useLoaderData()
  const { currentUser } = Route.useRouteContext()
  const { theme, artists, viewer, followedScores, reviews, stats } = detail
  const { isHidden, reason, reveal } = useSensitiveTheme(theme)
  const songName = theme.songTitle ?? `${THEME_TYPE_SINGULAR[theme.type]} ${theme.themeSlug}`
  const otherReviews = reviews.filter((themeReview) => !themeReview.isViewer)

  return (
    <div className="space-y-4">
      {/* Phones: one column. From `lg`: cover, title and stats on the left; actions and reviews on the right. */}
      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start lg:gap-8 lg:space-y-0">
        <div className="space-y-4 lg:sticky lg:top-20">
          <header className="relative flex gap-4 lg:flex-col">
            {/* Duplicate of the anime link below: out of the tab order. */}
            <Link
              to="/anime/$slug"
              params={{ slug: theme.animeSlug }}
              tabIndex={-1}
              aria-hidden="true"
              className="shrink-0 lg:w-full"
            >
              <Cover
                priority
                url={theme.coverLargeUrl ?? theme.coverUrl}
                title={isHidden ? '' : theme.animeTitle}
                seed={theme.animeSlug}
                className={cn(
                  'size-28 rounded-2xl text-3xl sm:size-36 lg:aspect-[3/4] lg:h-auto lg:w-full lg:text-6xl',
                  isHidden && 'blur-md',
                )}
              />
            </Link>
            <div
              className={cn('flex min-w-0 flex-col justify-end gap-1', isHidden && 'blur-md select-none')}
              aria-hidden={isHidden}
            >
              <Link
                to="/anime/$slug"
                params={{ slug: theme.animeSlug }}
                className="font-display text-lg leading-snug font-bold text-text underline-offset-4 hover:text-accent-text hover:underline"
              >
                {theme.animeTitle}
              </Link>
              <p className="text-xs font-bold tracking-wider text-accent-text uppercase">
                {THEME_TYPE_SINGULAR[theme.type]} · {theme.themeSlug}
              </p>
              <h1 className="font-display text-[28px] leading-tight font-bold tracking-tight">{songName}</h1>
              <p className="text-sm">
                {artists.length === 0 ? (
                  <span className="text-muted">Unknown artist</span>
                ) : (
                  artists.map((themeArtist, index) => (
                    <span key={themeArtist.slug}>
                      {index > 0 && ', '}
                      <Link
                        to="/artist/$slug"
                        params={{ slug: themeArtist.slug }}
                        className="font-semibold hover:text-accent-text"
                      >
                        {themeArtist.name}
                      </Link>
                    </span>
                  ))
                )}
              </p>
            </div>
            {isHidden && reason && (
              <button
                type="button"
                onClick={reveal}
                className="absolute inset-0 flex items-center justify-center rounded-2xl bg-bg/60 text-sm font-bold backdrop-blur-sm"
              >
                {reason} — tap to show
              </button>
            )}
          </header>

          <a
            href={animeThemesWatchUrl(theme.animeSlug, theme.themeSlug)}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-surface text-sm font-semibold hover:bg-surface-2"
          >
            Watch on AnimeThemes <ExternalLink aria-hidden="true" className="size-4" />
          </a>

          <StatCards detail={detail} />
        </div>

        <div className="space-y-4">
          <section aria-labelledby="your-score-heading" className={cardClass}>
            <h2 id="your-score-heading" className="mb-2 text-sm font-semibold">
              Your score
            </h2>
            {viewer ? (
              <ScorePicker
                themeId={theme.themeId}
                currentScore={viewer.score}
                hasReview={viewer.reviewBody !== null}
                label={`Your score for ${songName}`}
              />
            ) : (
              <p className="text-sm text-muted">
                <Link to="/login" className="font-semibold text-accent-text underline">
                  Sign in
                </Link>{' '}
                to rate this {THEME_TYPE_SINGULAR[theme.type].toLowerCase()}.
              </p>
            )}
          </section>

          {viewer && (
            <section aria-labelledby="your-review-heading" className={cardClass}>
              <h2 id="your-review-heading" className="mb-2 text-sm font-semibold">
                Your review
              </h2>
              {viewer.score === null ? (
                <p className="text-sm text-muted">Rate it first, then you can write a review.</p>
              ) : (
                <ReviewForm
                  key={viewer.reviewBody ?? ''}
                  themeId={theme.themeId}
                  currentBody={viewer.reviewBody}
                />
              )}
            </section>
          )}

          {stats.voteCount > 0 && <Distribution distribution={stats.distribution} />}

          {followedScores.length > 0 && (
            <section aria-labelledby="following-heading" className={cardClass}>
              <h2 id="following-heading" className="mb-2 text-sm font-semibold">
                People you follow
              </h2>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {followedScores.map((followed) =>
                  followed.username ? (
                    <li key={followed.username}>
                      <Link
                        to="/u/$username"
                        params={{ username: followed.username }}
                        className="text-muted hover:text-text"
                      >
                        {followed.displayUsername ?? followed.username}
                      </Link>{' '}
                      <b>{followed.score}</b>
                    </li>
                  ) : null,
                )}
              </ul>
            </section>
          )}

          <section aria-labelledby="reviews-heading" className="space-y-2">
            <h2 id="reviews-heading" className={sectionTitleClass}>
              Reviews <span className="text-muted">{otherReviews.length}</span>
            </h2>
            {otherReviews.length === 0 ? (
              <p className="text-sm text-muted">No reviews from others yet.</p>
            ) : (
              <ul className="space-y-2">
                {otherReviews.map((themeReview) => {
                  const name = themeReview.displayUsername ?? themeReview.username ?? 'someone'
                  return (
                    <li key={themeReview.username} className={cardClass}>
                      <div className="mb-1 flex items-center gap-2">
                        {themeReview.username ? (
                          <Link
                            to="/u/$username"
                            params={{ username: themeReview.username }}
                            tabIndex={-1}
                            aria-hidden="true"
                          >
                            <Avatar image={themeReview.image} name={name} className="size-7 text-xs" />
                          </Link>
                        ) : (
                          <Avatar image={themeReview.image} name={name} className="size-7 text-xs" />
                        )}
                        {themeReview.username ? (
                          <Link
                            to="/u/$username"
                            params={{ username: themeReview.username }}
                            className="text-sm font-semibold"
                          >
                            {name}
                          </Link>
                        ) : (
                          <span className="text-sm font-semibold">{name}</span>
                        )}
                        <span className="rounded-md bg-accent-soft px-1.5 text-xs font-bold text-accent-text">
                          {themeReview.score}
                        </span>
                        {currentUser && themeReview.username && (
                          <div className="ml-auto">
                            <ReportButton themeId={theme.themeId} username={themeReview.username} />
                          </div>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-line">{themeReview.body}</p>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
