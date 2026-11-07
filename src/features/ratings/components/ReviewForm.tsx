import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { inputClass, primaryButtonClass, secondaryButtonClass } from '#/components/ui'
import { REVIEW_MAX_LENGTH } from '../limits'
import { removeReview, saveReview } from '../server'

export function ReviewForm({ themeId, currentBody }: { themeId: number; currentBody: string | null }) {
  const router = useRouter()
  const [body, setBody] = useState(currentBody ?? '')
  const [isEditing, setIsEditing] = useState(currentBody === null)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function run(action: () => Promise<unknown>) {
    setIsSaving(true)
    setErrorMessage(null)
    try {
      await action()
      await router.invalidate()
      return true
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const saved = await run(() => saveReview({ data: { themeId, body } }))
    if (saved) setIsEditing(false)
  }

  async function handleDelete() {
    const deleted = await run(() => removeReview({ data: { themeId } }))
    if (deleted) {
      setBody('')
      setIsEditing(true)
    }
  }

  if (!isEditing && currentBody) {
    return (
      <div className="space-y-2">
        <p className="text-sm leading-relaxed whitespace-pre-line">{currentBody}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setIsEditing(true)} className={secondaryButtonClass}>
            Edit review
          </button>
          <button type="button" onClick={handleDelete} disabled={isSaving} className={secondaryButtonClass}>
            Delete
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor="review-body" className="sr-only">
        Your review
      </label>
      <textarea
        id="review-body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={REVIEW_MAX_LENGTH}
        rows={3}
        placeholder="What makes this one worth not skipping?"
        className={inputClass}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">
          {body.length}/{REVIEW_MAX_LENGTH}
        </span>
        <div className="flex gap-2">
          {currentBody && (
            <button
              type="button"
              onClick={() => {
                setBody(currentBody)
                setIsEditing(false)
              }}
              className={secondaryButtonClass}
            >
              Cancel
            </button>
          )}
          <button type="submit" disabled={isSaving || body.trim() === ''} className={primaryButtonClass}>
            Save review
          </button>
        </div>
      </div>
      {errorMessage && (
        <p role="alert" className="text-sm text-accent-text">
          {errorMessage}
        </p>
      )}
    </form>
  )
}
