import { useRouteContext } from '@tanstack/react-router'
import { useState } from 'react'

// Spoiler/NSFW themes are blurred with a "show" button, unless the viewer turned that kind off in
// Settings (decisions.md #11). Anonymous visitors always get the blur.
export function useSensitiveTheme(theme: { spoiler: boolean; nsfw: boolean }) {
  const { currentUser } = useRouteContext({ from: '__root__' })
  const [isRevealed, setIsRevealed] = useState(false)
  const settings = currentUser?.settings

  const hidesNsfw = theme.nsfw && !settings?.showNsfw
  const hidesSpoiler = theme.spoiler && !settings?.showSpoilers
  const reason = hidesNsfw ? 'NSFW' : hidesSpoiler ? 'Spoiler' : null

  return {
    isHidden: reason !== null && !isRevealed,
    reason,
    reveal: () => setIsRevealed(true),
  }
}
