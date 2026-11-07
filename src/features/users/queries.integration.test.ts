import { describe, expect, it } from 'vitest'
import { seedAll } from '../../../tests/fixtures/seed'
import { FIXTURE_USERS } from '../../../tests/fixtures/users'
import { setupTestDatabase } from '../../../tests/support/integration'
import {
  DEFAULT_SETTINGS,
  findSettings,
  findUserProfile,
  followUser,
  listFollows,
  unfollowUser,
  updateSettings,
} from './queries'

const database = setupTestDatabase(seedAll)
const { alice, bob, carol } = FIXTURE_USERS

describe('findUserProfile', () => {
  it('returns null for an unknown username', async () => {
    expect(await findUserProfile(database, 'nobody', null)).toBeNull()
  })

  it('finds the user case-insensitively, with ratings best first, top 10 in order and stats', async () => {
    const profile = await findUserProfile(database, 'ALICE', null)
    if (!profile || profile.isHidden) throw new Error('expected a visible profile')

    expect(profile.user.username).toBe('alice')
    expect(profile.bio).toBe('Never skips an OP. Sometimes skips the ED.')
    expect(profile.ratings.map((userRating) => userRating.score)).toEqual([10, 9, 8, 7, 6])
    expect(profile.favorites.map((favorite) => favorite.songTitle)).toEqual([
      'Run to the Stars',
      'Forged Bloom',
      'Quiet Orbit',
    ])
    expect(profile.stats).toMatchObject({ ratedCount: 5, meanScore: 8, openingCount: 4, endingCount: 1 })
    expect(profile.followingCount).toBe(1)
  })

  it('tells whether the viewer follows the profile', async () => {
    expect((await findUserProfile(database, 'bob', alice.id))?.isFollowing).toBe(true)
    expect((await findUserProfile(database, 'alice', bob.id))?.isFollowing).toBe(false)
  })

  it('hides a private profile from others but not from its owner', async () => {
    expect(await findUserProfile(database, 'carol', alice.id)).toMatchObject({ isHidden: true })
    expect(await findUserProfile(database, 'carol', carol.id)).toMatchObject({
      isHidden: false,
      isOwner: true,
    })
  })
})

describe('follows', () => {
  it('follows and unfollows by username, idempotently, never yourself', async () => {
    await followUser(database, bob.id, 'alice')
    await followUser(database, bob.id, 'alice')
    await followUser(database, bob.id, 'bob')

    expect(
      (await listFollows(database, 'alice', 'followers', null))?.users.map((user) => user.username),
    ).toEqual(['bob'])
    expect((await listFollows(database, 'bob', 'following', null))?.users).toHaveLength(1)

    await unfollowUser(database, bob.id, 'alice')
    expect((await listFollows(database, 'alice', 'followers', null))?.users).toEqual([])
  })

  it("doesn't list a private user's follows to others", async () => {
    expect(await listFollows(database, 'carol', 'followers', alice.id)).toBeNull()
    expect(await listFollows(database, 'carol', 'followers', carol.id)).not.toBeNull()
  })
})

describe('settings', () => {
  it('defaults when nothing was saved, and saves partial changes', async () => {
    expect(await findSettings(database, bob.id)).toEqual(DEFAULT_SETTINGS)

    await updateSettings(database, bob.id, { showSpoilers: true })
    await updateSettings(database, bob.id, { bio: 'Hi' })

    expect(await findSettings(database, bob.id)).toEqual({
      ...DEFAULT_SETTINGS,
      showSpoilers: true,
      bio: 'Hi',
    })
  })
})
