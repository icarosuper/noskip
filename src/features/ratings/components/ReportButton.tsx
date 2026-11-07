import { Flag } from 'lucide-react'
import { useState } from 'react'
import { reportThemeReview } from '../server'

export function ReportButton({ themeId, username }: { themeId: number; username: string }) {
  const [isReported, setIsReported] = useState(false)

  async function report() {
    const confirmed = window.confirm(`Report ${username}'s review as abusive or spam?`)
    if (!confirmed) return
    await reportThemeReview({ data: { themeId, username } })
    setIsReported(true)
  }

  if (isReported) return <span className="text-xs text-muted">Reported</span>
  return (
    <button
      type="button"
      onClick={report}
      aria-label={`Report ${username}'s review`}
      className="flex size-9 items-center justify-center rounded-lg text-muted hover:text-text"
    >
      <Flag aria-hidden="true" className="size-4" />
    </button>
  )
}
