import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { SCORES } from '#/features/catalog/constants'
import { cn } from '#/lib/cn'
import { rateTheme, removeRating } from '../server'

interface ScorePickerProps {
  themeId: number
  currentScore: number | null
  label: string
  // Called after the score is saved (or cleared) and the loaders re-ran.
  onSaved?: () => void
}

// Ten buttons, 1–10. Tapping the current score again clears it (asks first if a review would go
// with it — the review cascades from the rating).
export function ScorePicker({ themeId, currentScore, label, onSaved }: ScorePickerProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  async function pick(score: number) {
    setIsSaving(true)
    try {
      const isClearing = score === currentScore
      if (isClearing) await removeRating({ data: { themeId } })
      else await rateTheme({ data: { themeId, score } })
      // Re-runs the loaders so averages and vote counts refresh.
      await router.invalidate()
      onSaved?.()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <fieldset disabled={isSaving} className="disabled:opacity-60">
      <legend className="sr-only">{label}</legend>
      <div className="grid grid-cols-10 gap-1">
        {SCORES.map((score) => {
          const isSelected = score === currentScore
          return (
            <button
              key={score}
              type="button"
              aria-pressed={isSelected}
              aria-label={isSelected ? `Score ${score} (tap again to remove)` : `Score ${score}`}
              onClick={() => pick(score)}
              className={cn(
                'h-11 rounded-[10px] text-sm font-bold transition-colors',
                isSelected ? 'bg-accent text-accent-contrast' : 'bg-surface-2 text-text hover:bg-line',
              )}
            >
              {score}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
