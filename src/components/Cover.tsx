import { cn } from '#/lib/cn'

// Mid-dark hues, each ≥ 4.5:1 against the white initials (checked by the axe E2E scan).
const PLACEHOLDER_COLORS = [
  '#5b3fd9',
  '#a8402a',
  '#22694c',
  '#1d63a0',
  '#7a540c',
  '#7a3d8f',
  '#a83262',
  '#365f80',
]

function hashString(value: string) {
  let hash = 0
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) | 0
  return Math.abs(hash)
}

function initialsOf(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')
}

interface CoverProps {
  url: string | null
  title: string
  // Seeds the placeholder color, so one anime keeps the same color everywhere.
  seed: string
  className?: string
  // Above-the-fold covers: fetched right away and first. The rest load lazily (when scrolled near).
  priority?: boolean
}

// Where AnimeThemes serves covers from; the root route preconnects to it so the first image doesn't
// pay for DNS + TLS. Covers are slow from there (no cache headers) — see docs/TODO.md.
export const COVER_ORIGIN = 'https://pub-92474f7785774e91a790e086dfa6b2ef.r2.dev'

// The anime cover, or a colored block with its initials when there is none. While a cover loads,
// its box shows a neutral surface instead of the page background.
export function Cover({ url, title, seed, className, priority = false }: CoverProps) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className={cn('bg-surface-2 object-cover', className)}
      />
    )
  }
  return (
    <div
      aria-hidden="true"
      className={cn('flex items-center justify-center font-display font-bold text-white', className)}
      style={{ background: PLACEHOLDER_COLORS[hashString(seed) % PLACEHOLDER_COLORS.length] }}
    >
      {initialsOf(title)}
    </div>
  )
}
