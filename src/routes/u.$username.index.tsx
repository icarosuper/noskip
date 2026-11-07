import { createFileRoute, Link } from '@tanstack/react-router'
import { Lock, MessageSquareText } from 'lucide-react'
import { z } from 'zod'
import { Avatar } from '#/components/Avatar'
import { EmptyState } from '#/components/EmptyState'
import { chipClass, secondaryButtonClass, sectionTitleClass } from '#/components/ui'
import { ViewToggle } from '#/components/ViewToggle'
import { ThemeCollection, ThemeRow } from '#/features/catalog/components/ThemeItems'
import { RATED_THEME_TYPES } from '#/features/catalog/constants'
import { FavoriteControls } from '#/features/ratings/components/FavoriteControls'
import { MAX_FAVORITES } from '#/features/ratings/limits'
import { FollowButton } from '#/features/users/components/FollowButton'
import type { findUserProfile } from '#/features/users/queries'
import { getUserProfile } from '#/features/users/server'
import { cn } from '#/lib/cn'

export const Route = createFileRoute('/u/$username/')({
  validateSearch: z.object({
    type: z.enum(RATED_THEME_TYPES).optional(),
    sort: z.enum(['score', 'recent']).optional(),
  }),
  loader: ({ params }) => getUserProfile({ data: { username: params.username } }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.user.displayUsername ?? loaderData.user.username} · NoSkip`
          : 'NoSkip',
      },
    ],
  }),
  component: ProfilePage,
})

type Profile = NonNullable<Awaited<ReturnType<typeof findUserProfile>>>
type VisibleProfile = Extract<Profile, { isHidden: false }>

function ProfileHeader({ profile }: { profile: Profile }) {
  const { currentUser } = Route.useRouteContext()
  const username = profile.user.username ?? ''
  const name = profile.user.displayUsername ?? username

  return (
    <header className="space-y-3">
      <div className="flex items-center gap-4">
        <Avatar image={profile.user.image} name={name} className="size-20 text-3xl" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-bold tracking-tight">{name}</h1>
          <p className="flex gap-3 text-sm text-muted">
            <Link
              to="/u/$username/$kind"
              params={{ username, kind: 'followers' }}
              className="hover:text-text"
            >
              <b className="text-text">{profile.followerCount}</b> followers
            </Link>
            <Link
              to="/u/$username/$kind"
              params={{ username, kind: 'following' }}
              className="hover:text-text"
            >
              <b className="text-text">{profile.followingCount}</b> following
            </Link>
          </p>
        </div>
      </div>
      {profile.bio && <p className="text-[15px] leading-snug">{profile.bio}</p>}
      {profile.isOwner ? (
        <Link to="/settings" className={cn(secondaryButtonClass, 'w-full')}>
          Edit profile
        </Link>
      ) : currentUser ? (
        <div className="[&>button]:w-full">
          <FollowButton username={username} isFollowing={profile.isFollowing} />
        </div>
      ) : null}
    </header>
  )
}

function TopTen({ profile }: { profile: VisibleProfile }) {
  const { favorites, isOwner } = profile
  return (
    <section aria-labelledby="top-heading" className="space-y-3">
      <h2 id="top-heading" className={sectionTitleClass}>
        Top {MAX_FAVORITES}
      </h2>
      {favorites.length === 0 ? (
        <EmptyState>
          {isOwner ? 'Add themes to your top 10 from their page (the heart button).' : 'No favorites yet.'}
        </EmptyState>
      ) : (
        <ol aria-label={`Top ${MAX_FAVORITES}`} className="space-y-1.5">
          {favorites.map((favorite, index) => (
            <li key={favorite.themeId}>
              <ThemeRow
                theme={favorite}
                rank={favorite.position}
                aside={
                  isOwner ? (
                    <FavoriteControls
                      themeId={favorite.themeId}
                      songName={favorite.songTitle ?? favorite.themeSlug}
                      isFirst={index === 0}
                      isLast={index === favorites.length - 1}
                    />
                  ) : favorite.score !== null ? (
                    <span className="font-display text-lg font-bold text-accent-text">{favorite.score}</span>
                  ) : null
                }
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function Stats({ stats }: { stats: VisibleProfile['stats'] }) {
  const maxCount = Math.max(1, ...stats.distribution.map((bucket) => bucket.count))
  const figures = [
    { label: 'Rated', value: stats.ratedCount },
    { label: 'Mean', value: stats.meanScore === null ? '—' : stats.meanScore.toFixed(1) },
    { label: 'OP / ED', value: `${stats.openingCount} / ${stats.endingCount}` },
    { label: 'Reviews', value: stats.reviewCount },
  ]
  return (
    <section aria-labelledby="stats-heading" className="space-y-3">
      <h2 id="stats-heading" className={sectionTitleClass}>
        Stats
      </h2>
      <div className="rounded-2xl bg-surface p-3">
        <dl className="grid grid-cols-4 gap-2">
          {figures.map((figure) => (
            <div key={figure.label}>
              <dt className="text-[11px] font-semibold tracking-wide text-muted uppercase">{figure.label}</dt>
              <dd className="font-display text-xl font-bold">{figure.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex h-16 items-end gap-1" aria-label="Score distribution" role="img">
          {stats.distribution.map((bucket) => (
            <div key={bucket.score} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-sm bg-accent"
                style={{
                  height: `${Math.max(2, (bucket.count / maxCount) * 44)}px`,
                  opacity: bucket.count ? 1 : 0.25,
                }}
                title={`${bucket.score}: ${bucket.count}`}
              />
              <span className="text-[10px] font-semibold text-muted">{bucket.score}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function RatingList({ profile }: { profile: VisibleProfile }) {
  const search = Route.useSearch()
  const sort = search.sort ?? 'score'

  // Already sorted by score from the server; "recent" re-sorts a copy.
  const ratings = profile.ratings.filter((userRating) => !search.type || userRating.type === search.type)
  if (sort === 'recent') {
    ratings.sort((first, second) => new Date(second.ratedAt).getTime() - new Date(first.ratedAt).getTime())
  }

  return (
    <section aria-labelledby="list-heading" data-view-scope="profile" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="list-heading" className={sectionTitleClass}>
          Ratings <span className="text-muted">{profile.ratings.length}</span>
        </h2>
        <div className="flex">
          <ViewToggle scope="profile" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {[undefined, ...RATED_THEME_TYPES].map((type) => (
          <Link
            key={type ?? 'all'}
            to="."
            search={(prev) => ({ ...prev, type })}
            aria-current={search.type === type ? 'true' : undefined}
            className={chipClass(search.type === type)}
          >
            {type ?? 'OP + ED'}
          </Link>
        ))}
        <span className="mx-1 w-px bg-line" aria-hidden="true" />
        {(['score', 'recent'] as const).map((value) => (
          <Link
            key={value}
            to="."
            search={(prev) => ({ ...prev, sort: value === 'score' ? undefined : value })}
            aria-current={sort === value ? 'true' : undefined}
            className={chipClass(sort === value)}
          >
            {value === 'score' ? 'Top scored' : 'Recent'}
          </Link>
        ))}
      </div>
      <ThemeCollection
        themes={ratings}
        view="saved"
        label="Ratings"
        emptyMessage={profile.isOwner ? 'You haven’t rated anything yet.' : 'No ratings yet.'}
        renderAside={(userRating) => (
          <span className="inline-flex items-center gap-1.5">
            {userRating.hasReview && (
              <MessageSquareText aria-label="Has a review" className="size-4 text-muted" />
            )}
            <span data-testid="score" className="font-display text-xl font-bold text-accent-text">
              {userRating.score}
            </span>
          </span>
        )}
      />
    </section>
  )
}

function ProfilePage() {
  const profile = Route.useLoaderData()

  // Phones: one column in the order header → top 10 → stats → list (flex `order`). From `lg`: header
  // and stats on the left, top 10 and list on the right; the wrappers are `display: contents` below
  // `lg` so their children join the single column.
  return (
    <div className="flex flex-col gap-7 lg:grid lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div className="contents lg:sticky lg:top-20 lg:block lg:space-y-7">
        <div className="order-1">
          <ProfileHeader profile={profile} />
        </div>
        {!profile.isHidden && (
          <div className="order-3">
            <Stats stats={profile.stats} />
          </div>
        )}
      </div>
      <div className="contents lg:block lg:space-y-7">
        {profile.isHidden ? (
          <div className="order-2">
            <EmptyState>
              <Lock aria-hidden="true" className="mx-auto mb-2 size-5" />
              This profile is private.
            </EmptyState>
          </div>
        ) : (
          <>
            <div className="order-2">
              <TopTen profile={profile} />
            </div>
            <div className="order-4">
              <RatingList profile={profile} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
