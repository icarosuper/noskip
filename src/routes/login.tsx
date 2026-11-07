import { createFileRoute, redirect } from '@tanstack/react-router'
import { DiscordIcon, GoogleIcon } from '#/features/auth/components/ProviderIcons'
import { authClient } from '#/lib/auth-client'
import { cn } from '#/lib/cn'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.currentUser) throw redirect({ to: '/' })
  },
  head: () => ({ meta: [{ title: 'Sign in · NoSkip' }] }),
  component: LoginPage,
})

// Brand colors on purpose (not theme tokens): the providers' own button styles, same in both themes.
const PROVIDERS = [
  {
    id: 'discord',
    label: 'Continue with Discord',
    Icon: DiscordIcon,
    className: 'bg-[#5865F2] text-white hover:bg-[#4752C4]',
  },
  {
    id: 'google',
    label: 'Continue with Google',
    Icon: GoogleIcon,
    className: 'border border-[#dadce0] bg-white text-[#1f1f1f] hover:bg-[#f2f2f2]',
  },
] as const

function LoginPage() {
  function signInWith(provider: (typeof PROVIDERS)[number]['id']) {
    // New users land on / and the root route sends them to /onboarding to pick a username.
    void authClient.signIn.social({ provider, callbackURL: '/' })
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-10">
      <div className="space-y-2 text-center">
        <p className="font-display text-4xl font-bold tracking-tight">
          no<span className="text-accent">skip</span>
        </p>
        <h1 className="text-lg font-semibold">Sign in to rate openings and endings</h1>
        <p className="text-sm text-muted">No password: use an account you already have.</p>
      </div>
      <div className="space-y-2">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => signInWith(provider.id)}
            className={cn(
              'flex h-12 w-full items-center justify-center gap-3 rounded-xl font-semibold transition-colors',
              provider.className,
            )}
          >
            <provider.Icon className="size-5" />
            {provider.label}
          </button>
        ))}
      </div>
    </div>
  )
}
