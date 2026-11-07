import { relations, sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
// Relative import: drizzle-kit loads this file without the #/ alias.
import { MAX_FAVORITES, REVIEW_MAX_LENGTH } from '../../features/ratings/limits'
import { user } from './auth'
import { theme } from './catalog'

export { MAX_FAVORITES, REVIEW_MAX_LENGTH }

// One score per (user, theme). Re-rating overwrites — there is no rating history.
export const rating = pgTable(
  'rating',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    themeId: integer('theme_id')
      .notNull()
      .references(() => theme.id, { onDelete: 'cascade' }),
    score: smallint().notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.themeId] }),
    index('rating_theme_id_idx').on(table.themeId),
    check('rating_score_range', sql`${table.score} between 1 and 10`),
  ],
)

export const ratingRelations = relations(rating, ({ one }) => ({
  user: one(user, { fields: [rating.userId], references: [user.id] }),
  theme: one(theme, { fields: [rating.themeId], references: [theme.id] }),
}))

// A short text attached to a rating: it can't exist without one (composite FK), so removing the
// score removes the review too.
export const review = pgTable(
  'review',
  {
    userId: text('user_id').notNull(),
    themeId: integer('theme_id').notNull(),
    body: text().notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.themeId] }),
    foreignKey({
      columns: [table.userId, table.themeId],
      foreignColumns: [rating.userId, rating.themeId],
    }).onDelete('cascade'),
    index('review_theme_id_idx').on(table.themeId),
    check(
      'review_body_length',
      sql`char_length(${table.body}) between 1 and ${sql.raw(String(REVIEW_MAX_LENGTH))}`,
    ),
  ],
)

// One report per (reporter, review). Reviewed by hand for now — there is no moderation UI.
export const reviewReport = pgTable(
  'review_report',
  {
    reporterId: text('reporter_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    reviewUserId: text('review_user_id').notNull(),
    themeId: integer('theme_id').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.reporterId, table.reviewUserId, table.themeId] }),
    foreignKey({
      columns: [table.reviewUserId, table.themeId],
      foreignColumns: [review.userId, review.themeId],
    }).onDelete('cascade'),
  ],
)

// The user's top 10, in their order. (user, position) is unique, so a user holds at most 10.
export const favorite = pgTable(
  'favorite',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    themeId: integer('theme_id')
      .notNull()
      .references(() => theme.id, { onDelete: 'cascade' }),
    position: smallint().notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.themeId] }),
    unique('favorite_user_position_unique').on(table.userId, table.position),
    check('favorite_position_range', sql`${table.position} between 1 and ${sql.raw(String(MAX_FAVORITES))}`),
  ],
)
