// Fills the DEV database with made-up users and what they create — ratings, reviews, top 10s,
// follows, bios — on top of the real catalog you imported, so the UI can be reviewed with real
// covers and believable numbers. Touches only users whose id starts with "demo-" (deleted and
// re-created on every run; everything they own cascades). Deterministic: same catalog → same data.
//
//   bun run db:seed-demo
//
// Prints a line to paste in the browser console on http://localhost:3000 to browse signed in as
// the first demo user (no OAuth needed; decisions.md #8 — the app itself has no such backdoor).

import { inArray, like } from 'drizzle-orm'
import { createDatabase } from '#/db/client'
import { favorite, follow, MAX_FAVORITES, profile, rating, review, theme, user } from '#/db/schema'
import { RATED_THEME_TYPES } from '#/features/catalog/constants'
import { createStorageState } from '../../tests/support/test-auth'

const DEMO_USER_COUNT = 40
const DEMO_ID_PREFIX = 'demo-'

const NAMES = [
  'akari',
  'ren',
  'sora',
  'yuki',
  'haru',
  'mika',
  'kenji',
  'rio',
  'nao',
  'taro',
  'emi',
  'shun',
  'aoi',
  'kaito',
  'hina',
  'riku',
  'saki',
  'jun',
  'mei',
  'daichi',
  'lena',
  'marco',
  'ines',
  'theo',
  'nora',
  'felix',
  'clara',
  'bruno',
  'iris',
  'leo',
  'maya',
  'omar',
  'zoe',
  'ivan',
  'luna',
  'hugo',
  'vera',
  'nico',
  'ana',
  'eli',
]

const BIOS = [
  'OP > ED, always.',
  'Here for the endings nobody stays for.',
  'Sakuga first, song second.',
  'If the OP has a key change, it gets a 10.',
  'Seasonal watcher, chronic re-rater.',
  null,
  null,
]

const REVIEWS = [
  'The drop at the chorus is unreal. Never skipped it once.',
  'Great song, but the animation carries it.',
  'Grew on me by episode 4. Now it lives in my head.',
  'Fine, but forgettable next to the first opening.',
  'This ending hits harder after the finale.',
  'Pure hype. The cuts sync perfectly with the beat.',
  'A calm ED that fits the show perfectly.',
  'Too generic for me, skipped it after week 2.',
]

// mulberry32: tiny seeded PRNG, so the demo data is the same on every run.
function createRandom(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

const random = createRandom(20261107)
const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)]
const clampScore = (value: number) => Math.min(10, Math.max(1, Math.round(value)))

const databaseUrl = process.env.DATABASE_URL
const authSecret = process.env.BETTER_AUTH_SECRET
const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
if (!databaseUrl || !authSecret)
  throw new Error('DATABASE_URL and BETTER_AUTH_SECRET must be set (.env.local)')

const database = createDatabase(databaseUrl)

const themes = await database
  .select({ id: theme.id })
  .from(theme)
  .where(inArray(theme.type, [...RATED_THEME_TYPES]))
if (themes.length === 0) throw new Error('The catalog is empty — run `bun run import:animethemes` first')

// Every theme gets a hidden "quality"; users score around it, so rankings look like rankings.
const qualityByThemeId = new Map(themes.map((row) => [row.id, 4 + random() * 5.5]))

await database.delete(user).where(like(user.id, `${DEMO_ID_PREFIX}%`))

const now = new Date()
const demoUsers = NAMES.slice(0, DEMO_USER_COUNT).map((name, index) => ({
  id: `${DEMO_ID_PREFIX}${String(index + 1).padStart(2, '0')}`,
  name,
  email: `${name}@demo.noskip.test`,
  emailVerified: true,
  username: name,
  displayUsername: name,
  createdAt: now,
  updatedAt: now,
}))
await database.insert(user).values(demoUsers)

const ratingRows: { userId: string; themeId: number; score: number }[] = []
const reviewRows: { userId: string; themeId: number; body: string }[] = []
const favoriteRows: { userId: string; themeId: number; position: number }[] = []

for (const demoUser of demoUsers) {
  const generosity = (random() - 0.5) * 2
  const coverage = 0.25 + random() * 0.5
  const ratedThemes = themes.filter(() => random() < coverage)

  for (const ratedTheme of ratedThemes) {
    const quality = qualityByThemeId.get(ratedTheme.id) ?? 6
    const score = clampScore(quality + generosity + (random() - 0.5) * 3)
    ratingRows.push({ userId: demoUser.id, themeId: ratedTheme.id, score })
    const writesReview = random() < 0.12
    if (writesReview) reviewRows.push({ userId: demoUser.id, themeId: ratedTheme.id, body: pick(REVIEWS) })
  }

  const topScored = ratingRows
    .filter((row) => row.userId === demoUser.id)
    .sort((first, second) => second.score - first.score)
    .slice(0, Math.floor(random() * (MAX_FAVORITES + 1)))
  topScored.forEach((row, index) => {
    favoriteRows.push({ userId: demoUser.id, themeId: row.themeId, position: index + 1 })
  })
}

const followRows = demoUsers.flatMap((follower) => {
  const others = demoUsers.filter((other) => other.id !== follower.id && random() < 0.15)
  return others.map((other) => ({ followerId: follower.id, followingId: other.id }))
})

const profileRows = demoUsers.map((demoUser, index) => ({
  userId: demoUser.id,
  bio: pick(BIOS),
  // Two private profiles, never the first user (the one you sign in as).
  isPrivate: index === 7 || index === 23,
}))

const CHUNK_SIZE = 1000
async function insertInChunks<TRow>(insert: (rows: TRow[]) => Promise<unknown>, rows: TRow[]) {
  for (let start = 0; start < rows.length; start += CHUNK_SIZE)
    await insert(rows.slice(start, start + CHUNK_SIZE))
}

await insertInChunks((rows) => database.insert(rating).values(rows), ratingRows)
await insertInChunks((rows) => database.insert(review).values(rows), reviewRows)
await insertInChunks((rows) => database.insert(favorite).values(rows), favoriteRows)
await insertInChunks((rows) => database.insert(follow).values(rows), followRows)
await database.insert(profile).values(profileRows)

const storageState = await createStorageState(database, demoUsers[0].id, { secret: authSecret, baseURL })
const cookieAssignments = storageState.cookies.map(
  (cookie) => `document.cookie = ${JSON.stringify(`${cookie.name}=${cookie.value}; path=/`)}`,
)

console.log(
  `Demo data: ${demoUsers.length} users, ${ratingRows.length} ratings, ${reviewRows.length} reviews, ` +
    `${favoriteRows.length} favorites, ${followRows.length} follows, over ${themes.length} themes.`,
)
console.log(`\nSign in as "${demoUsers[0].username}" — paste in the console on ${baseURL}:\n`)
console.log(`${cookieAssignments.join('; ')}; location.reload()`)

await database.$client.end()
