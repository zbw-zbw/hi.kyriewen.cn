import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  date,
  varchar,
  index,
} from 'drizzle-orm/pg-core';

/**
 * 留言墙：每条留言由 GitHub OAuth 用户发布
 */
export const guestbookMessages = pgTable(
  'guestbook_messages',
  {
    id: serial('id').primaryKey(),
    userId: varchar('user_id', { length: 128 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    avatar: text('avatar'),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('guestbook_created_idx').on(table.createdAt)]
);

/**
 * 数据看板：每日一次的快照
 */
export const statsSnapshot = pgTable(
  'stats_snapshot',
  {
    id: serial('id').primaryKey(),
    date: date('date').notNull().unique(),
    githubStars: integer('github_stars').notNull().default(0),
    githubFollowers: integer('github_followers').notNull().default(0),
    chromeTotalUsers: integer('chrome_total_users').notNull().default(0),
    newsletterSubscribers: integer('newsletter_subscribers')
      .notNull()
      .default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('stats_date_idx').on(table.date)]
);

/**
 * 单项产品级数据（每个 Chrome 扩展的用户数）
 */
export const productStats = pgTable(
  'product_stats',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 64 }).notNull(),
    date: date('date').notNull(),
    users: integer('users').notNull().default(0),
    stars: integer('stars').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('product_stats_slug_date_idx').on(table.slug, table.date)]
);

export type GuestbookMessage = typeof guestbookMessages.$inferSelect;
export type NewGuestbookMessage = typeof guestbookMessages.$inferInsert;
export type StatsSnapshot = typeof statsSnapshot.$inferSelect;
export type ProductStat = typeof productStats.$inferSelect;
