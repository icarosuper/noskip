import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'noskip-theme'

// Runs in <head> before the first paint, so a saved theme never flashes the other one.
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`

export type ThemePreference = 'system' | 'light' | 'dark'

export function readThemePreference(): ThemePreference {
  const saved = document.documentElement.dataset.theme
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

export function applyThemePreference(preference: ThemePreference) {
  try {
    if (preference === 'system') {
      delete document.documentElement.dataset.theme
      localStorage.removeItem(STORAGE_KEY)
    } else {
      document.documentElement.dataset.theme = preference
      localStorage.setItem(STORAGE_KEY, preference)
    }
  } catch {
    // Private mode: the choice lasts until reload.
  }
}

function currentTheme(): 'light' | 'dark' {
  const saved = document.documentElement.dataset.theme
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function ThemeToggle() {
  function toggle() {
    applyThemePreference(currentTheme() === 'dark' ? 'light' : 'dark')
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light and dark theme"
      className="flex size-11 items-center justify-center rounded-xl text-muted hover:bg-surface hover:text-text"
    >
      <Sun aria-hidden="true" className="when-dark size-5" />
      <Moon aria-hidden="true" className="when-light size-5" />
    </button>
  )
}
