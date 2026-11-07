import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, HeadContent, redirect, Scripts } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { BottomNav, Footer, TopBar } from '#/components/AppShell'
import { COVER_ORIGIN } from '#/components/Cover'
import { HydrationMarker } from '#/components/HydrationMarker'
import { THEME_INIT_SCRIPT } from '#/components/ThemeToggle'
import { VIEW_INIT_SCRIPT } from '#/components/view-preference'
import { getCurrentUser } from '#/features/auth/server'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import appCss from '../styles.css?url'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ location }) => {
    const currentUser = await getCurrentUser()
    // A signed-in user without a username has no public profile yet — finish onboarding first.
    const needsOnboarding = currentUser !== null && currentUser.username === null
    if (needsOnboarding && location.pathname !== '/onboarding') throw redirect({ to: '/onboarding' })
    return { currentUser }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'NoSkip' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: COVER_ORIGIN },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    // The init scripts set data-theme / data-view-* before React hydrates; differing attributes are expected.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: constant script, no user input */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT + VIEW_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      {/* Extensions add attributes to <body> before React loads (e.g. Video Speed Controller's
          class="vsc-initialized"). This only silences attribute mismatches on <body> itself. */}
      <body suppressHydrationWarning>
        <HydrationMarker />
        <TopBar />
        <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>
        <Footer />
        <BottomNav />
        <TanStackDevtools
          config={{ position: 'middle-right' }}
          plugins={[
            { name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
