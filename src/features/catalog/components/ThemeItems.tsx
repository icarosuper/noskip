import { Link } from '@tanstack/react-router'
import { Cover } from '#/components/Cover'
import { EmptyState } from '#/components/EmptyState'
import { cn } from '#/lib/cn'
import type { ThemeSummary } from '../theme-summary'
import { useSensitiveTheme } from './useSensitiveTheme'

export type CollectionView = 'list' | 'grid'

// The first covers of a list are fetched eagerly. When both forms are rendered (view="saved"),
// only the list's small covers are (~3 KB each): an eager image is downloaded even while hidden,
// and the grid's large covers (~100 KB) would be wasted on phones.
const PRIORITY_COVER_COUNT = 6

interface ThemeItemProps {
  theme: ThemeSummary
  rank?: number
  // Right side of a row / bottom of a card: a score, the viewer's score, controls…
  aside?: React.ReactNode
  // Cards only: accent ring around the cover (the #1 of a top list).
  isHighlighted?: boolean
  // Load the cover right away (first items of a list).
  priority?: boolean
}

function songLabel(theme: ThemeSummary) {
  return theme.songTitle ?? `${theme.animeTitle} ${theme.themeSlug}`
}

function RevealButton({ reason, onReveal }: { reason: string; onReveal: () => void }) {
  return (
    <button
      type="button"
      onClick={onReveal}
      aria-label={`Show ${reason.toLowerCase()} theme`}
      className="absolute inset-0 flex items-center justify-center bg-bg/70 text-[10px] font-bold tracking-wider text-text uppercase backdrop-blur-md"
    >
      {reason}
    </button>
  )
}

// The cover goes to the theme page too. Out of the tab order and hidden from screen readers: the
// title link next to it already is that link. The reveal button is a sibling, never inside.
function CoverLink({ theme, children }: { theme: ThemeSummary; children: React.ReactNode }) {
  return (
    <Link
      to="/anime/$slug/$theme"
      params={{ slug: theme.animeSlug, theme: theme.themeSlug }}
      tabIndex={-1}
      aria-hidden="true"
      className="block size-full"
    >
      {children}
    </Link>
  )
}

export function ThemeRow({ theme, rank, aside, priority }: ThemeItemProps) {
  const { isHidden, reason, reveal } = useSensitiveTheme(theme)

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface p-2 pr-3">
      {rank !== undefined && (
        <span className="w-7 shrink-0 text-center font-display text-lg font-bold text-muted">{rank}</span>
      )}
      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
        <CoverLink theme={theme}>
          <Cover
            priority={priority}
            url={theme.coverUrl}
            title={isHidden ? '' : theme.animeTitle}
            seed={theme.animeSlug}
            className={cn('size-full text-sm', isHidden && 'blur-md')}
          />
        </CoverLink>
        {isHidden && reason && <RevealButton reason={reason} onReveal={reveal} />}
      </div>
      <Link
        to="/anime/$slug/$theme"
        params={{ slug: theme.animeSlug, theme: theme.themeSlug }}
        className="min-w-0 flex-1"
      >
        <p className={cn('truncate font-semibold', isHidden && 'blur-sm select-none')} aria-hidden={isHidden}>
          {songLabel(theme)}
        </p>
        {isHidden && <span className="sr-only">Hidden {reason?.toLowerCase()} theme</span>}
        {theme.artists && <p className="truncate text-[13px] text-muted">{theme.artists}</p>}
        <p className="truncate text-xs text-muted">
          {theme.animeTitle} · <span className="font-semibold text-accent-text">{theme.themeSlug}</span>
        </p>
      </Link>
      {aside && <div className="shrink-0 text-right">{aside}</div>}
    </div>
  )
}

export function ThemeCard({ theme, rank, aside, isHighlighted = false, priority }: ThemeItemProps) {
  const { isHidden, reason, reveal } = useSensitiveTheme(theme)

  return (
    <div className="min-w-0">
      <div
        className={cn(
          'relative aspect-[3/4] overflow-hidden rounded-2xl',
          isHighlighted && 'ring-2 ring-accent ring-offset-2 ring-offset-bg',
        )}
      >
        <CoverLink theme={theme}>
          <Cover
            priority={priority}
            url={theme.coverLargeUrl ?? theme.coverUrl}
            title={isHidden ? '' : theme.animeTitle}
            seed={theme.animeSlug}
            className={cn('size-full text-2xl', isHidden && 'blur-md')}
          />
        </CoverLink>
        {rank !== undefined && (
          <span className="absolute top-2 left-2 rounded-lg bg-bg/80 px-2 py-0.5 font-display text-sm font-bold">
            {rank}
          </span>
        )}
        {isHidden && reason && <RevealButton reason={reason} onReveal={reveal} />}
      </div>
      <Link
        to="/anime/$slug/$theme"
        params={{ slug: theme.animeSlug, theme: theme.themeSlug }}
        className="mt-2 block"
      >
        <p
          className={cn('truncate text-sm font-semibold', isHidden && 'blur-sm select-none')}
          aria-hidden={isHidden}
        >
          {songLabel(theme)}
        </p>
        {isHidden && <span className="sr-only">Hidden {reason?.toLowerCase()} theme</span>}
        <p className="truncate text-xs text-muted">
          {theme.animeTitle} · <span className="font-semibold text-accent-text">{theme.themeSlug}</span>
        </p>
      </Link>
      {aside && <div className="mt-1">{aside}</div>}
    </div>
  )
}

interface ThemeCollectionProps<TTheme extends ThemeSummary> {
  themes: TTheme[]
  // A fixed view, or 'saved' = both rendered and CSS shows the screen's saved choice
  // (view-preference.ts; the page wraps it in its `data-view-scope`).
  view: CollectionView | 'saved'
  label: string
  showRank?: boolean
  emptyMessage: React.ReactNode
  // `view` lets the aside pick a compact form for cards.
  renderAside?: (theme: TTheme, view: CollectionView) => React.ReactNode
  // List view in two columns from `lg` — for short lists on wide screens.
  twoColumnList?: boolean
  // Highlights the first card (the #1) with an accent ring.
  highlightFirst?: boolean
}

export function ThemeCollection<TTheme extends ThemeSummary>({
  themes,
  view,
  label,
  showRank = false,
  emptyMessage,
  renderAside,
  twoColumnList = false,
  highlightFirst = false,
}: ThemeCollectionProps<TTheme>) {
  if (themes.length === 0) return <EmptyState>{emptyMessage}</EmptyState>

  // `isOnlyForm`: false when both forms are rendered for CSS to pick (view="saved").
  function renderAs(itemView: CollectionView, className?: string, isOnlyForm = true) {
    const Item = itemView === 'grid' ? ThemeCard : ThemeRow
    return (
      <ol
        aria-label={label}
        className={cn(
          itemView === 'grid'
            ? cn(
                'grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5',
                !highlightFirst && 'xl:grid-cols-6',
              )
            : twoColumnList
              ? 'space-y-1.5 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0'
              : 'space-y-1.5',
          className,
        )}
      >
        {themes.map((theme, index) => (
          <li key={theme.themeId} className="min-w-0">
            <Item
              isHighlighted={highlightFirst && index === 0}
              priority={index < PRIORITY_COVER_COUNT && (isOnlyForm || itemView === 'list')}
              theme={theme}
              rank={showRank ? index + 1 : undefined}
              aside={renderAside?.(theme, itemView)}
            />
          </li>
        ))}
      </ol>
    )
  }

  if (view !== 'saved') return renderAs(view)
  return (
    <>
      {renderAs('list', 'view-list-only', false)}
      {renderAs('grid', 'view-grid-only', false)}
    </>
  )
}

// Community score as shown in lists: the bayesian score for rankings, or a plain mean elsewhere.
export function ScoreAside({
  score,
  voteCount,
  view = 'list',
}: {
  score: number | null
  voteCount: number
  view?: CollectionView
}) {
  return (
    <div className={view === 'grid' ? 'flex items-baseline gap-1.5' : 'flex flex-col items-end'}>
      <span className="font-display text-lg font-bold">{score === null ? '—' : score.toFixed(1)}</span>
      <span className="text-[11px] text-muted">
        {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
      </span>
    </div>
  )
}
