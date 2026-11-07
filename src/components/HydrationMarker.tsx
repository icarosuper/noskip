import { useEffect } from 'react'

// Sets <html data-hydrated="true"> once React has taken over the server-rendered page. Before
// that, clicks and selects hit inert HTML and do nothing. E2E tests (tests/e2e/fixtures.ts) and
// agents browsing the app wait for this attribute before interacting (decisions.md #9).
export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = 'true'
  }, [])
  return null
}
