import { type ErrorComponentProps, Link, useRouter } from '@tanstack/react-router'
import { primaryButtonClass, secondaryButtonClass } from './ui'

// Router-wide fallbacks (router.tsx). A route that needs a different message defines its own
// errorComponent / notFoundComponent.

function FallbackLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md space-y-5 pt-16 text-center">
      <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
      {children}
    </div>
  )
}

export function NotFoundPage() {
  return (
    <FallbackLayout title="Page not found">
      <p className="text-muted">This page doesn't exist, or it was moved.</p>
      <Link to="/" className={primaryButtonClass}>
        Back to home
      </Link>
    </FallbackLayout>
  )
}

export function ErrorPage({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  // The message can carry internals (SQL, paths); show it only while developing.
  const shouldShowDetails = import.meta.env.DEV
  const errorMessage = error instanceof Error ? error.message : String(error)

  async function retry() {
    await router.invalidate()
    reset()
  }

  return (
    <FallbackLayout title="Something went wrong">
      <p className="text-muted">The error was logged. Try again, or come back in a moment.</p>
      {shouldShowDetails && (
        <pre className="overflow-x-auto rounded-xl bg-surface p-4 text-left text-xs text-muted">
          {errorMessage}
        </pre>
      )}
      <div className="flex justify-center gap-3">
        <button type="button" onClick={retry} className={primaryButtonClass}>
          Try again
        </button>
        <Link to="/" className={secondaryButtonClass}>
          Home
        </Link>
      </div>
    </FallbackLayout>
  )
}
