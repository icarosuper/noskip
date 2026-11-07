import { describe, expect, it } from 'vitest'
import { parseImportArgs, seasonOf } from './cli-args'

describe('parseImportArgs', () => {
  it('--all means no filter', () => {
    expect(parseImportArgs(['--all'])).toEqual({})
  })

  it('accepts a year alone', () => {
    expect(parseImportArgs(['--year', '2025'])).toEqual({ year: 2025, season: undefined })
  })

  it('accepts a season in any case', () => {
    expect(parseImportArgs(['--year', '2025', '--season', 'fall'])).toEqual({ year: 2025, season: 'FALL' })
  })

  it('--current-season picks the season today falls in', () => {
    const today = new Date('2026-11-07T12:00:00Z')

    expect(parseImportArgs(['--current-season'], today)).toEqual({ year: 2026, season: 'FALL' })
  })

  it('requires --year, --current-season or --all', () => {
    expect(() => parseImportArgs([])).toThrow(/--year/)
  })

  it('rejects a year that is not a number', () => {
    expect(() => parseImportArgs(['--year', 'last'])).toThrow(/--year must be a year/)
  })

  it('rejects an unknown season', () => {
    expect(() => parseImportArgs(['--year', '2025', '--season', 'monsoon'])).toThrow(
      /--season must be one of/,
    )
  })
})

describe('seasonOf', () => {
  it.each([
    ['2026-01-01T00:00:00Z', 'WINTER'],
    ['2026-03-31T23:59:59Z', 'WINTER'],
    ['2026-04-01T00:00:00Z', 'SPRING'],
    ['2026-07-15T00:00:00Z', 'SUMMER'],
    ['2026-12-31T23:59:59Z', 'FALL'],
  ])('%s is %s', (isoDate, expectedSeason) => {
    expect(seasonOf(new Date(isoDate)).season).toBe(expectedSeason)
  })
})
