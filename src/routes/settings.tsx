import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { applyThemePreference, readThemePreference, type ThemePreference } from '#/components/ThemeToggle'
import {
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  segmentClass,
  segmentGroupClass,
} from '#/components/ui'
import { BIO_MAX_LENGTH } from '#/features/users/limits'
import { saveSettings } from '#/features/users/server'
import { authClient } from '#/lib/auth-client'
import { cn } from '#/lib/cn'

export const Route = createFileRoute('/settings')({
  beforeLoad: ({ context }) => {
    if (!context.currentUser) throw redirect({ to: '/login' })
    return { currentUser: context.currentUser }
  },
  head: () => ({ meta: [{ title: 'Settings · NoSkip' }] }),
  component: SettingsPage,
})

// Mirrors the username plugin limits in src/lib/auth-options.ts; the server is the real check.
const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,24}$/

const cardClass = 'space-y-3 rounded-2xl bg-surface p-4'
const cardTitleClass = 'font-display text-base font-bold'

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-muted">{description}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative mt-1 h-7 w-12 shrink-0 rounded-full bg-surface-2 transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-text after:transition-transform peer-checked:after:translate-x-5 peer-checked:after:bg-accent-contrast"
      />
    </label>
  )
}

function useSaver() {
  const router = useRouter()
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function save(action: () => Promise<unknown>, successText: string) {
    setIsSaving(true)
    setMessage(null)
    try {
      await action()
      await router.invalidate()
      setMessage({ text: successText, isError: false })
      return true
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Could not save', isError: true })
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const status = message && (
    <p
      role={message.isError ? 'alert' : 'status'}
      className={cn('text-sm', message.isError ? 'text-accent-text' : 'text-muted')}
    >
      {message.text}
    </p>
  )
  return { save, isSaving, status }
}

function ProfileCard() {
  const { currentUser } = Route.useRouteContext()
  const { save, isSaving, status } = useSaver()
  const [username, setUsername] = useState(currentUser.username ?? '')
  const [bio, setBio] = useState(currentUser.settings.bio ?? '')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmedUsername = username.trim()
    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      await save(
        () => Promise.reject(new Error('Username: 3–24 characters, letters, numbers, "_" or "."')),
        '',
      )
      return
    }
    await save(async () => {
      if (trimmedUsername.toLowerCase() !== currentUser.username) {
        const { error } = await authClient.updateUser({
          username: trimmedUsername,
          displayUsername: trimmedUsername,
        })
        if (error) throw new Error(error.message ?? 'Could not change the username')
      }
      await saveSettings({ data: { bio } })
    }, 'Profile saved.')
  }

  return (
    <form onSubmit={handleSubmit} className={cardClass}>
      <h2 className={cardTitleClass}>Profile</h2>
      <div className="space-y-1">
        <label htmlFor="username" className="text-sm font-semibold">
          Username
        </label>
        <input
          id="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="off"
          className={inputClass}
        />
        <p className="text-xs text-muted">Your profile is at /u/{username.trim().toLowerCase() || '…'}</p>
      </div>
      <div className="space-y-1">
        <label htmlFor="bio" className="text-sm font-semibold">
          Bio
        </label>
        <input
          id="bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          maxLength={BIO_MAX_LENGTH}
          placeholder="A line about your taste"
          className={inputClass}
        />
        <p className="text-xs text-muted">
          {bio.length}/{BIO_MAX_LENGTH}
        </p>
      </div>
      <button type="submit" disabled={isSaving} className={primaryButtonClass}>
        Save profile
      </button>
      {status}
    </form>
  )
}

function PreferencesCard() {
  const { currentUser } = Route.useRouteContext()
  const { save, status } = useSaver()
  const { settings } = currentUser
  // Rendered after hydration: the saved theme lives in the browser, the server can't know it.
  const [theme, setTheme] = useState<ThemePreference | null>(null)
  useEffect(() => setTheme(readThemePreference()), [])

  function pickTheme(preference: ThemePreference) {
    applyThemePreference(preference)
    setTheme(preference)
  }

  return (
    <section aria-labelledby="preferences-heading" className={cardClass}>
      <h2 id="preferences-heading" className={cardTitleClass}>
        Preferences
      </h2>
      <div className="space-y-1">
        <p className="font-semibold">Theme</p>
        <div className={segmentGroupClass}>
          {(['system', 'dark', 'light'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => pickTheme(value)}
              className={segmentClass(theme === value)}
            >
              {value === 'system' ? 'System' : value === 'dark' ? 'Dark' : 'Light'}
            </button>
          ))}
        </div>
      </div>
      <Toggle
        label="Always show spoilers"
        description="Themes flagged as spoilers are blurred until you tap them."
        checked={settings.showSpoilers}
        onChange={(checked) => save(() => saveSettings({ data: { showSpoilers: checked } }), 'Saved.')}
      />
      <Toggle
        label="Always show NSFW"
        description="Themes flagged NSFW are blurred until you tap them."
        checked={settings.showNsfw}
        onChange={(checked) => save(() => saveSettings({ data: { showNsfw: checked } }), 'Saved.')}
      />
      <Toggle
        label="Private profile"
        description="Others can't see your profile, lists or reviews. Your scores still count in the rankings, anonymously."
        checked={settings.isPrivate}
        onChange={(checked) => save(() => saveSettings({ data: { isPrivate: checked } }), 'Saved.')}
      />
      {status}
    </section>
  )
}

function AccountCard() {
  const { currentUser } = Route.useRouteContext()
  const router = useRouter()
  const [confirmation, setConfirmation] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const canDelete = confirmation.trim().toLowerCase() === currentUser.username

  async function signOut() {
    await authClient.signOut()
    await router.invalidate()
    await router.navigate({ to: '/' })
  }

  async function deleteAccount() {
    setIsDeleting(true)
    const { error } = await authClient.deleteUser()
    setIsDeleting(false)
    if (error) {
      setErrorMessage(error.message ?? 'Could not delete the account. Sign out, sign in again and retry.')
      return
    }
    await router.invalidate()
    await router.navigate({ to: '/' })
  }

  return (
    <section aria-labelledby="account-heading" className={cardClass}>
      <h2 id="account-heading" className={cardTitleClass}>
        Account
      </h2>
      <button type="button" onClick={signOut} className={cn(secondaryButtonClass, 'w-full bg-surface-2')}>
        Sign out
      </button>
      <details className="rounded-xl border border-line p-3">
        <summary className="cursor-pointer font-semibold">Delete account</summary>
        <div className="mt-3 space-y-2">
          <p className="text-sm text-muted">
            Deletes your account, ratings, reviews, top 10 and follows. This can't be undone. Type your
            username to confirm.
          </p>
          <label htmlFor="delete-confirmation" className="sr-only">
            Type your username to confirm
          </label>
          <input
            id="delete-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={currentUser.username ?? ''}
            autoComplete="off"
            className={inputClass}
          />
          <button
            type="button"
            disabled={!canDelete || isDeleting}
            onClick={deleteAccount}
            className={cn(primaryButtonClass, 'w-full')}
          >
            Delete my account
          </button>
          {errorMessage && (
            <p role="alert" className="text-sm text-accent-text">
              {errorMessage}
            </p>
          )}
        </div>
      </details>
    </section>
  )
}

function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
      <ProfileCard />
      <PreferencesCard />
      <AccountCard />
    </div>
  )
}
