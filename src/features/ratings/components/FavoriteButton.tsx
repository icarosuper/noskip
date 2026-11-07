import { useRouter } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { useState } from 'react'
import { MAX_FAVORITES } from '#/features/ratings/limits'
import { cn } from '#/lib/cn'
import { favoriteTheme, unfavoriteTheme } from '../server'

interface FavoriteButtonProps {
  themeId: number
  position: number | null
  favoriteCount: number
}

export function FavoriteButton({ themeId, position, favoriteCount }: FavoriteButtonProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const isFavorite = position !== null
  const isFull = !isFavorite && favoriteCount >= MAX_FAVORITES

  async function toggle() {
    setIsSaving(true)
    try {
      if (isFavorite) await unfavoriteTheme({ data: { themeId } })
      else await favoriteTheme({ data: { themeId } })
      await router.invalidate()
    } finally {
      setIsSaving(false)
    }
  }

  const label = isFavorite
    ? `#${position} in top ${MAX_FAVORITES}`
    : isFull
      ? `Top ${MAX_FAVORITES} full`
      : 'Add to top 10'

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isSaving || isFull}
      aria-pressed={isFavorite}
      title={isFull ? 'Remove a theme from your top 10 first' : undefined}
      className={cn(
        'flex w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-surface p-2 text-[11px] font-semibold disabled:opacity-60',
        isFavorite ? 'text-accent-text' : 'text-muted hover:text-text',
      )}
    >
      <Heart aria-hidden="true" className={cn('size-6', isFavorite && 'fill-current')} />
      {label}
    </button>
  )
}
