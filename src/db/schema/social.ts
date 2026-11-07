import { sql } from 'drizzle-orm'
import { boolean, check, index, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
// Relative import: drizzle-kit loads this file without the #/ alias.
import { BIO_MAX_LENGTH } from '../../features/users/limits'
import { user } from './auth'

export { BIO_MAX_LENGTH }

// App-owned user fields, kept out of the Better Auth `user` table (that schema is generated).
// A missing row means the defaults below.
export const profile = pgTable(
  'profile',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    bio: text(),
    // Private: the profile page, lists and reviews are hidden from others; ratings still count in
    // the rankings, anonymously.
    isPrivate: boolean('is_private').notNull().default(false),
    showSpoilers: boolean('show_spoilers').notNull().default(false),
    showNsfw: boolean('show_nsfw').notNull().default(false),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check('profile_bio_length', sql`char_length(${table.bio}) <= ${sql.raw(String(BIO_MAX_LENGTH))}`),
  ],
)

export const follow = pgTable(
  'follow',
  {
    followerId: text('follower_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    followingId: text('following_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followingId] }),
    index('follow_following_id_idx').on(table.followingId),
    check('follow_not_self', sql`${table.followerId} <> ${table.followingId}`),
  ],
)
