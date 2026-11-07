import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { inputClass, primaryButtonClass } from '#/components/ui'
import { authClient } from '#/lib/auth-client'
import { cn } from '#/lib/cn'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: ({ context }) => {
    if (!context.currentUser) throw redirect({ to: '/login' })
    if (context.currentUser.username) throw redirect({ to: '/' })
  },
  component: OnboardingPage,
})

// Mirrors the username plugin limits in src/lib/auth-options.ts; the server is the real check.
const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,24}$/

function OnboardingPage() {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const username = String(new FormData(event.currentTarget).get('username') ?? '').trim()

    const isValidFormat = USERNAME_PATTERN.test(username)
    if (!isValidFormat) {
      setErrorMessage('3–24 characters: letters, numbers, "_" or "."')
      return
    }

    setIsSaving(true)
    const { error } = await authClient.updateUser({ username, displayUsername: username })
    setIsSaving(false)

    if (error) {
      setErrorMessage(error.message ?? 'Could not save this username')
      return
    }
    await router.invalidate()
    await router.navigate({ to: '/u/$username', params: { username: username.toLowerCase() } })
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-4 pt-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Pick a username</h1>
      <p className="text-sm text-muted">It's your public profile URL. You can't skip this step.</p>
      <label htmlFor="username" className="block text-sm font-semibold">
        Username
      </label>
      <input id="username" name="username" required autoComplete="off" className={inputClass} />
      {errorMessage && (
        <p role="alert" className="text-sm text-accent-text">
          {errorMessage}
        </p>
      )}
      <button type="submit" disabled={isSaving} className={cn(primaryButtonClass, 'w-full')}>
        Save
      </button>
    </form>
  )
}
