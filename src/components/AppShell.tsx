import { Link, useRouteContext } from '@tanstack/react-router'
import { BarChart3, Home, Search, Settings, UserRound } from 'lucide-react'
import { Avatar } from './Avatar'
import { ThemeToggle } from './ThemeToggle'

// Phones: top bar (logo, theme, settings) + bottom tab bar. From `sm` up the tabs move into the
// top bar and the bottom bar disappears.

function Logo() {
  return (
    <Link
      to="/"
      className="font-display text-[22px] font-bold tracking-tight sm:text-[26px]"
      aria-label="NoSkip home"
    >
      no<span className="text-accent">skip</span>
    </Link>
  )
}

function useTabs() {
  const { currentUser } = useRouteContext({ from: '__root__' })
  const profileTab = currentUser?.username
    ? ({
        to: '/u/$username',
        params: { username: currentUser.username },
        label: 'Profile',
        Icon: UserRound,
      } as const)
    : ({ to: '/login', params: {}, label: 'Sign in', Icon: UserRound } as const)
  return [
    { to: '/', params: {}, label: 'Home', Icon: Home, exact: true },
    { to: '/rankings', params: {}, label: 'Rankings', Icon: BarChart3, exact: false },
    { to: '/search', params: {}, label: 'Search', Icon: Search, exact: false },
    { ...profileTab, exact: false },
  ] as const
}

export function TopBar() {
  const { currentUser } = useRouteContext({ from: '__root__' })
  const tabs = useTabs()

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-8 px-4 sm:h-[72px]">
        <Logo />
        <nav aria-label="Main" className="hidden gap-6 sm:flex">
          {tabs
            .filter((tab) => tab.to !== '/login')
            .map((tab) => (
              <Link
                key={tab.label}
                to={tab.to}
                params={tab.params}
                activeOptions={{ exact: tab.exact }}
                className="text-[15px] font-semibold text-muted hover:text-text data-[status=active]:text-accent-text"
              >
                {tab.label}
              </Link>
            ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          {currentUser && (
            <Link
              to="/settings"
              aria-label="Settings"
              className="flex size-11 items-center justify-center rounded-xl text-muted hover:bg-surface hover:text-text"
            >
              <Settings aria-hidden="true" className="size-5" />
            </Link>
          )}
          {!currentUser && (
            <Link
              to="/login"
              className="ml-1 inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-bold text-accent-contrast hover:brightness-110"
            >
              Sign in
            </Link>
          )}
          {currentUser?.username && (
            <Link
              to="/u/$username"
              params={{ username: currentUser.username }}
              className="ml-1 hidden sm:block"
            >
              <Avatar image={currentUser.image} name={currentUser.username} className="size-9 text-sm" />
              <span className="sr-only">Your profile</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export function BottomNav() {
  const tabs = useTabs()
  return (
    <nav
      aria-label="Tabs"
      className="fixed inset-x-0 bottom-0 z-20 flex h-16 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      {tabs.map(({ label, Icon, ...tab }) => (
        <Link
          key={label}
          to={tab.to}
          params={tab.params}
          activeOptions={{ exact: tab.exact }}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted data-[status=active]:font-semibold data-[status=active]:text-accent-text"
        >
          <Icon aria-hidden="true" className="size-[22px]" />
          {label}
        </Link>
      ))}
    </nav>
  )
}

export function Footer() {
  return (
    <footer className="mx-auto max-w-6xl px-4 pt-6 pb-24 text-xs text-muted sm:pb-8">
      Theme data from{' '}
      <a href="https://animethemes.moe" className="underline hover:text-accent-text">
        AnimeThemes
      </a>
      . Not affiliated with AnimeThemes or AniList.
    </footer>
  )
}
