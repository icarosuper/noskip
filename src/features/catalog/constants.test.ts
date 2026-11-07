import { describe, expect, it } from 'vitest'
import { animeThemesWatchUrl, currentSeason, formatVoteCount } from './constants'

describe('currentSeason', () => {
  it.each([
    ['2026-01-01', 'WINTER'],
    ['2026-03-31', 'WINTER'],
    ['2026-04-01', 'SPRING'],
    ['2026-06-30', 'SPRING'],
    ['2026-07-01', 'SUMMER'],
    ['2026-09-30', 'SUMMER'],
    ['2026-10-01', 'FALL'],
    ['2026-12-31', 'FALL'],
  ])('%s is %s', (isoDate, expectedSeason) => {
    const middayLocal = new Date(`${isoDate}T12:00:00`)
    expect(currentSeason(middayLocal)).toEqual({ year: 2026, season: expectedSeason })
  })
})

describe('animeThemesWatchUrl', () => {
  it('builds the AnimeThemes page of a theme', () => {
    expect(animeThemesWatchUrl('iron_petals', 'OP2')).toBe('https://animethemes.moe/anime/iron_petals/OP2')
  })
})

describe('formatVoteCount', () => {
  it.each([
    [0, '0 votes'],
    [1, '1 vote'],
    [2, '2 votes'],
  ])('%i → %s', (voteCount, expectedLabel) => {
    expect(formatVoteCount(voteCount)).toBe(expectedLabel)
  })
})
