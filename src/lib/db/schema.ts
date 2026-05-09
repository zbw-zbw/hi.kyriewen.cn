import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  date,
  varchar,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * 留言/评论统一表：
 * - 留言墙：postSlug = null
 * - 博客评论：postSlug = blog 的 slug
 * - 楼中楼：parentId 指向父留言 id；null 表示顶层
 */
export const guestbookMessages = pgTable(
  'guestbook_messages',
  {
    id: serial('id').primaryKey(),
    userId: varchar('user_id', { length: 128 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    avatar: text('avatar'),
    /** 原文（Markdown）；渲染前由 server 端 sanitize */
    body: text('body').notNull(),
    /** 楼中楼：父留言 id；顶层为 null。同一表自引用避免再建一张表。 */
    parentId: integer('parent_id'),
    /** 博客评论场景：所属 blog slug；留言墙场景为 null。 */
    postSlug: varchar('post_slug', { length: 128 }),
    /** 编辑时间；首次发布时为 null，编辑后更新 */
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('guestbook_created_idx').on(table.createdAt),
    index('guestbook_parent_idx').on(table.parentId),
    index('guestbook_post_slug_idx').on(table.postSlug),
  ]
);

/**
 * 通用点赞表：targetType + targetId 唯一标识被点赞对象。
 * - targetType = 'message'：targetId = guestbookMessages.id（字符串化）
 * - targetType = 'post'   ：targetId = blog post slug
 */
export const likes = pgTable(
  'likes',
  {
    id: serial('id').primaryKey(),
    userId: varchar('user_id', { length: 128 }).notNull(),
    targetType: varchar('target_type', { length: 32 }).notNull(),
    targetId: varchar('target_id', { length: 128 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('likes_unique_idx').on(
      table.userId,
      table.targetType,
      table.targetId
    ),
    index('likes_target_idx').on(table.targetType, table.targetId),
  ]
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

/**
 * 页面浏览量统计表：按 slug 聚合。
 * - slug 格式示例：'blog/my-post'、'projects/my-project'
 */
export const pageViews = pgTable(
  'page_views',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 256 }).notNull().unique(),
    views: integer('views').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('page_views_slug_idx').on(table.slug)]
);

export type GuestbookMessage = typeof guestbookMessages.$inferSelect;
export type NewGuestbookMessage = typeof guestbookMessages.$inferInsert;
export type StatsSnapshot = typeof statsSnapshot.$inferSelect;
export type ProductStat = typeof productStats.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type NewLike = typeof likes.$inferInsert;
export type LikeTargetType = 'message' | 'post';
export type PageView = typeof pageViews.$inferSelect;
