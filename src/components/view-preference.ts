// List/grid choice per screen, saved in localStorage (decisions.md #12).
//
// Collections render BOTH forms; CSS in styles.css shows one. Without a saved choice: list on
// phones, grid from `lg`. With one: `<html data-view-<scope>="list|grid">`, set before first paint
// by VIEW_INIT_SCRIPT and updated by the toggle — no flash, same markup on server and client.

// `home` has no toggle: it only gets the responsive default.
export const VIEW_SCOPES = ['home', 'rankings', 'season', 'artist', 'profile'] as const
export type ViewScope = (typeof VIEW_SCOPES)[number]

const storageKey = (scope: ViewScope) => `noskip-view:${scope}`

export const VIEW_INIT_SCRIPT = `try{${JSON.stringify(VIEW_SCOPES)}.forEach(function(s){var v=localStorage.getItem('noskip-view:'+s);if(v==='list'||v==='grid')document.documentElement.setAttribute('data-view-'+s,v)})}catch(e){}`

export function saveViewPreference(scope: ViewScope, view: 'list' | 'grid') {
  document.documentElement.setAttribute(`data-view-${scope}`, view)
  try {
    localStorage.setItem(storageKey(scope), view)
  } catch {
    // Private mode: the choice lasts until reload.
  }
}
