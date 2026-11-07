import { parseArgs } from 'node:util'
import { currentSeason } from '#/features/catalog/constants'
import type { AnimeFilter, Season } from './animethemes-client'

const SEASONS: Season[] = ['WINTER', 'SPRING', 'SUMMER', 'FALL']

// `--all` → no filter; `--year` alone → one year; `--year` + `--season` → one season;
// `--current-season` → the season `today` falls in (what the daily sync imports).
export function parseImportArgs(args: string[], today = new Date()): AnimeFilter {
  const { values } = parseArgs({
    args,
    options: {
      year: { type: 'string' },
      season: { type: 'string' },
      all: { type: 'boolean' },
      'current-season': { type: 'boolean' },
    },
  })

  if (values.all) return {}
  if (values['current-season']) return currentSeason(today)
  if (!values.year) {
    throw new Error('Pass --year <yyyy> [--season WINTER|SPRING|SUMMER|FALL], --current-season or --all')
  }

  const year = Number(values.year)
  const isValidYear = Number.isInteger(year) && year > 1900
  if (!isValidYear) throw new Error(`--year must be a year, got "${values.year}"`)

  const season = values.season?.toUpperCase() as Season | undefined
  const isUnknownSeason = season !== undefined && !SEASONS.includes(season)
  if (isUnknownSeason) throw new Error(`--season must be one of ${SEASONS.join(', ')}`)

  return { year, season }
}
