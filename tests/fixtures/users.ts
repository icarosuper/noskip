import { THEME } from './catalog'

// `key` names the storage-state file (tests/e2e/.auth/<key>.json) and is what agents pass to
// `agent-browser --state`. `newbie` has no username yet: signing in as them lands on /onboarding.
export const FIXTURE_USERS = {
  alice: { id: 'user-alice', name: 'Alice', email: 'alice@example.test', username: 'alice' },
  bob: { id: 'user-bob', name: 'Bob', email: 'bob@example.test', username: 'bob' },
  newbie: { id: 'user-newbie', name: 'New Person', email: 'newbie@example.test', username: null },
  // Private profile: her page shows "private", her review is hidden, her scores still count.
  carol: { id: 'user-carol', name: 'Carol', email: 'carol@example.test', username: 'carol' },
  // Deletes their account in an E2E test; the reset re-creates them. No content, so nothing else depends on them.
  leaver: { id: 'user-leaver', name: 'Leaver', email: 'leaver@example.test', username: 'leaver' },
} as const

export type FixtureUserKey = keyof typeof FIXTURE_USERS

export const FIXTURE_RATINGS: { userKey: FixtureUserKey; themeAnimethemesId: number; score: number }[] = [
  { userKey: 'alice', themeAnimethemesId: THEME.starlightOp1, score: 10 },
  { userKey: 'alice', themeAnimethemesId: THEME.starlightEd1, score: 8 },
  { userKey: 'alice', themeAnimethemesId: THEME.kitchenOp1, score: 7 },
  { userKey: 'alice', themeAnimethemesId: THEME.ironOp1, score: 9 },
  { userKey: 'alice', themeAnimethemesId: THEME.ironOp2, score: 6 },
  { userKey: 'bob', themeAnimethemesId: THEME.starlightOp1, score: 9 },
  { userKey: 'bob', themeAnimethemesId: THEME.kitchenOp1, score: 8 },
  { userKey: 'bob', themeAnimethemesId: THEME.ironOp1, score: 10 },
  { userKey: 'bob', themeAnimethemesId: THEME.ironMovieEd1, score: 5 },
  { userKey: 'carol', themeAnimethemesId: THEME.ironEd1, score: 7 },
]

export const FIXTURE_PROFILES: { userKey: FixtureUserKey; bio?: string; isPrivate?: boolean }[] = [
  { userKey: 'alice', bio: 'Never skips an OP. Sometimes skips the ED.' },
  { userKey: 'carol', bio: 'Lurking.', isPrivate: true },
]

// Reviews need a rating of the same user and theme (see FIXTURE_RATINGS).
export const FIXTURE_REVIEWS: { userKey: FixtureUserKey; themeAnimethemesId: number; body: string }[] = [
  {
    userKey: 'bob',
    themeAnimethemesId: THEME.starlightOp1,
    body: 'The chorus hits right as the baton changes hands. Goosebumps every week.',
  },
  { userKey: 'carol', themeAnimethemesId: THEME.ironEd1, body: 'Hidden: carol is private.' },
]

// In top-10 order.
export const FIXTURE_FAVORITES: { userKey: FixtureUserKey; themeAnimethemesIds: number[] }[] = [
  { userKey: 'alice', themeAnimethemesIds: [THEME.starlightOp1, THEME.ironOp1, THEME.starlightEd1] },
]

// alice follows bob.
export const FIXTURE_FOLLOWS: { followerKey: FixtureUserKey; followingKey: FixtureUserKey }[] = [
  { followerKey: 'alice', followingKey: 'bob' },
]
