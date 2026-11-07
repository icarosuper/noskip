import { describe, expect, it } from 'vitest'
import { currentSeason } from '#/features/catalog/constants'
import { THEME } from '../../../tests/fixtures/catalog'
import { seedAll } from '../../../tests/fixtures/seed'
import { FIXTURE_RATINGS } from '../../../tests/fixtures/users'
import { truncateAllTables } from '../../../tests/support/database'
import { setupTestDatabase } from '../../../tests/support/integration'
import { bayesianAverage, MIN_VOTES_GLOBAL } from './bayesian'
import { queryRanking } from './queries'

const database = setupTestDatabase(seedAll)

function fixtureScoresOf(themeAnimethemesId: number) {
  return FIXTURE_RATINGS.filter(
    (fixtureRating) => fixtureRating.themeAnimethemesId === themeAnimethemesId,
  ).map((fixtureRating) => fixtureRating.score)
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

describe('queryRanking', () => {
  it('computes the same weighted score as bayesianAverage()', async () => {
    const ranking = await queryRanking(database, { limit: 50 })

    const meanScore = average(FIXTURE_RATINGS.map((fixtureRating) => fixtureRating.score))
    const starlightOp1Scores = fixtureScoresOf(THEME.starlightOp1)
    const expectedScore = bayesianAverage({
      voteCount: starlightOp1Scores.length,
      averageScore: average(starlightOp1Scores),
      minVotes: MIN_VOTES_GLOBAL,
      meanScore,
    })

    const starlightOp1 = ranking.find((rankedTheme) => rankedTheme.songTitle === 'Run to the Stars')
    expect(starlightOp1?.voteCount).toBe(2)
    expect(starlightOp1?.averageScore).toBe(9.5)
    expect(starlightOp1?.weightedScore).toBeCloseTo(expectedScore, 6)
  })

  it('orders by weighted score, descending', async () => {
    const ranking = await queryRanking(database, { limit: 50 })

    const weightedScores = ranking.map((rankedTheme) => rankedTheme.weightedScore)
    expect(weightedScores).toEqual([...weightedScores].sort((left, right) => right - left))
  })

  it('only lists themes that have ratings', async () => {
    const ranking = await queryRanking(database, { limit: 50 })

    const ratedThemeCount = new Set(FIXTURE_RATINGS.map((fixtureRating) => fixtureRating.themeAnimethemesId))
      .size
    expect(ranking).toHaveLength(ratedThemeCount)
  })

  it('filters by theme type', async () => {
    const endings = await queryRanking(database, { type: 'ED', limit: 50 })

    expect(endings.length).toBeGreaterThan(0)
    expect(endings.every((rankedTheme) => rankedTheme.type === 'ED')).toBe(true)
  })

  it('limits a season ranking to anime of that season', async () => {
    const { year, season } = currentSeason()

    const seasonRanking = await queryRanking(database, { year, season, limit: 50 })

    const currentSeasonAnime = ['Starlight Relay', 'Kitchen Witch Diaries']
    expect(seasonRanking.map((rankedTheme) => rankedTheme.animeTitle)).toEqual(
      expect.arrayContaining(currentSeasonAnime),
    )
    expect(seasonRanking.every((rankedTheme) => currentSeasonAnime.includes(rankedTheme.animeTitle))).toBe(
      true,
    )
  })

  it('limits a year ranking to anime of that year', async () => {
    const yearRanking = await queryRanking(database, { year: 2024, limit: 50 })

    expect(new Set(yearRanking.map((rankedTheme) => rankedTheme.animeSlug))).toEqual(
      new Set(['iron_petals', 'iron_petals_the_movie']),
    )
  })

  it('respects the limit', async () => {
    expect(await queryRanking(database, { limit: 2 })).toHaveLength(2)
  })

  it('returns an empty list when nobody rated anything', async () => {
    await truncateAllTables(database)
    expect(await queryRanking(database, { limit: 50 })).toEqual([])
  })
})
