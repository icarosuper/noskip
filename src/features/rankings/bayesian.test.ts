import { describe, expect, it } from 'vitest'
import { bayesianAverage } from './bayesian'

describe('bayesianAverage', () => {
  it('pulls a theme with few votes toward the scope mean', () => {
    const singlePerfectVote = bayesianAverage({ voteCount: 1, averageScore: 10, minVotes: 5, meanScore: 7 })
    expect(singlePerfectVote).toBe(7.5)
  })

  it('ranks many high votes above one perfect vote', () => {
    const onePerfectVote = bayesianAverage({ voteCount: 1, averageScore: 10, minVotes: 5, meanScore: 7 })
    const fiftyNines = bayesianAverage({ voteCount: 50, averageScore: 9, minVotes: 5, meanScore: 7 })
    expect(fiftyNines).toBeGreaterThan(onePerfectVote)
  })

  it('approaches the plain average as votes grow', () => {
    const manyVotes = bayesianAverage({ voteCount: 10_000, averageScore: 8, minVotes: 5, meanScore: 5 })
    expect(manyVotes).toBeCloseTo(8, 2)
  })

  it('is the plain average when minVotes is zero', () => {
    expect(bayesianAverage({ voteCount: 3, averageScore: 6, minVotes: 0, meanScore: 9 })).toBe(6)
  })

  it('returns 0 instead of NaN when there is no weight at all', () => {
    expect(bayesianAverage({ voteCount: 0, averageScore: 0, minVotes: 0, meanScore: 0 })).toBe(0)
  })
})
