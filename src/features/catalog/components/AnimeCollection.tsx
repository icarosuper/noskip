import { Link } from '@tanstack/react-router'
import { Cover } from '#/components/Cover'
import { EmptyState } from '#/components/EmptyState'
import { cn } from '#/lib/cn'
import { SEASON_LABELS, type Season } from '../constants'
import type { CollectionView } from './ThemeItems'

interface AnimeSummary {
  slug: string
  titleRomaji: string
  titleEnglish: string | null
  coverUrl: string | null
  year: number | null
  season: Season | null
  format: string | null
}

function subtitle(anime: AnimeSummary) {
  const when = anime.season && anime.year ? `${SEASON_LABELS[anime.season]} ${anime.year}` : anime.year
  return [anime.format, when].filter(Boolean).join(' · ')
}

// `view: 'saved'` renders both forms for CSS to pick (see ThemeCollection).
export function AnimeCollection({
  animeList,
  view,
  label,
  emptyMessage,
}: {
  animeList: AnimeSummary[]
  view: CollectionView | 'saved'
  label: string
  emptyMessage: React.ReactNode
}) {
  if (animeList.length === 0) return <EmptyState>{emptyMessage}</EmptyState>
  if (view === 'list') return <AnimeList animeList={animeList} label={label} />
  if (view === 'grid') return <AnimeGrid animeList={animeList} label={label} />
  return (
    <>
      <AnimeList animeList={animeList} label={label} className="view-list-only" />
      <AnimeGrid animeList={animeList} label={label} className="view-grid-only" />
    </>
  )
}

interface FormProps {
  animeList: AnimeSummary[]
  label: string
  className?: string
}

function AnimeList({ animeList, label, className }: FormProps) {
  return (
    <ul aria-label={label} className={cn('space-y-1.5', className)}>
      {animeList.map((anime) => {
        const title = anime.titleEnglish ?? anime.titleRomaji
        return (
          <li key={anime.slug}>
            <Link
              to="/anime/$slug"
              params={{ slug: anime.slug }}
              className="flex items-center gap-3 rounded-2xl bg-surface p-2 pr-3 hover:bg-surface-2"
            >
              <Cover
                url={anime.coverUrl}
                title={title}
                seed={anime.slug}
                className="h-16 w-12 shrink-0 rounded-lg text-xs"
              />
              <div className="min-w-0">
                <p className="truncate font-semibold">{title}</p>
                {anime.titleEnglish && <p className="truncate text-[13px] text-muted">{anime.titleRomaji}</p>}
                <p className="text-xs text-muted">{subtitle(anime)}</p>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function AnimeGrid({ animeList, label, className }: FormProps) {
  return (
    <ul
      aria-label={label}
      className={cn('grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-6', className)}
    >
      {animeList.map((anime) => {
        const title = anime.titleEnglish ?? anime.titleRomaji
        return (
          <li key={anime.slug} className="min-w-0">
            <Link to="/anime/$slug" params={{ slug: anime.slug }} className="group block">
              <Cover
                url={anime.coverUrl}
                title={title}
                seed={anime.slug}
                className="aspect-[2/3] w-full rounded-xl text-xl"
              />
              <p className="mt-2 line-clamp-2 text-sm font-semibold group-hover:text-accent-text">{title}</p>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
