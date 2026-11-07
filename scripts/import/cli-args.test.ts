import { describe, expect, it } from 'vitest'
import { parseImportArgs } from './cli-args'

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

  it('requires --year or --all', () => {
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
