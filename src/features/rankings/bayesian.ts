// Bayesian average (decisions.md #4): a theme with few votes is pulled toward the mean of its
// scope, so one 10/10 doesn't top the chart. `minVotes` is the prior weight: how many votes at the
// mean every theme starts with. Raise it as the user base grows.
//
// queries.ts computes the same formula in SQL; the integration test checks both agree.

export const MIN_VOTES_GLOBAL = 5
export const MIN_VOTES_SEASON = 3

export interface BayesianInput {
  voteCount: number
  averageScore: number
  minVotes: number
  meanScore: number
}

export function bayesianAverage({ voteCount, averageScore, minVotes, meanScore }: BayesianInput): number {
  const totalWeight = voteCount + minVotes
  if (totalWeight === 0) return 0
  return (voteCount * averageScore + minVotes * meanScore) / totalWeight
}
