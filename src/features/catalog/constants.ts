// Shared by server and client — no DB imports here.

export const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'] as const
export type Season = (typeof SEASONS)[number]

export const THEME_TYPES = ['OP', 'ED', 'IN'] as const
export type ThemeType = (typeof THEME_TYPES)[number]

// Insert songs are imported but not rated or shown in v0 — only openings and endings.
export const RATED_THEME_TYPES = ['OP', 'ED'] as const satisfies readonly ThemeType[]
export type RatedThemeType = (typeof RATED_THEME_TYPES)[number]

export const SEASON_LABELS: Record<Season, string> = {
  WINTER: 'Winter',
  SPRING: 'Spring',
  SUMMER: 'Summer',
  FALL: 'Fall',
}

export const THEME_TYPE_LABELS: Record<ThemeType, string> = {
  OP: 'Openings',
  ED: 'Endings',
  IN: 'Insert songs',
}

export const THEME_TYPE_SINGULAR: Record<ThemeType, string> = {
  OP: 'Opening',
  ED: 'Ending',
  IN: 'Insert song',
}

export const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

// Anime seasons by month: Jan–Mar winter, Apr–Jun spring, Jul–Sep summer, Oct–Dec fall.
export function currentSeason(today = new Date()): { year: number; season: Season } {
  const seasonIndex = Math.floor(today.getMonth() / 3)
  return { year: today.getFullYear(), season: SEASONS[seasonIndex] }
}

// The v0 has no player: every theme links out to AnimeThemes (decisions.md #5).
export function animeThemesWatchUrl(animeSlug: string, themeSlug: string) {
  return `https://animethemes.moe/anime/${animeSlug}/${themeSlug}`
}
