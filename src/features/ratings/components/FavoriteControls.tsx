import { useRouter } from '@tanstack/react-router'
import { ArrowDown, ArrowUp, X } from 'lucide-react'
import { useState } from 'react'
import { moveFavoriteTheme, unfavoriteTheme } from '../server'

const iconButtonClass =
  'flex size-9 items-center justify-center rounded-lg bg-surface-2 text-muted hover:text-text disabled:opacity-30'

// Owner-only controls on the profile's top 10.
export function FavoriteControls({
  themeId,
  songName,
  isFirst,
  isLast,
}: {
  themeId: number
  songName: string
  isFirst: boolean
  isLast: boolean
}) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  async function run(action: () => Promise<unknown>) {
    setIsSaving(true)
    try {
      await action()
      await router.invalidate()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex gap-1">
      <button
        type="button"
        aria-label={`Move ${songName} up`}
        disabled={isSaving || isFirst}
        onClick={() => run(() => moveFavoriteTheme({ data: { themeId, step: -1 } }))}
        className={iconButtonClass}
      >
        <ArrowUp aria-hidden="true" className="size-4" />
      </button>
      <button
        type="button"
        aria-label={`Move ${songName} down`}
        disabled={isSaving || isLast}
        onClick={() => run(() => moveFavoriteTheme({ data: { themeId, step: 1 } }))}
        className={iconButtonClass}
      >
        <ArrowDown aria-hidden="true" className="size-4" />
      </button>
      <button
        type="button"
        aria-label={`Remove ${songName} from top 10`}
        disabled={isSaving}
        onClick={() => run(() => unfavoriteTheme({ data: { themeId } }))}
        className={iconButtonClass}
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}
