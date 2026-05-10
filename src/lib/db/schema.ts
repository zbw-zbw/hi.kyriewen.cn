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
 * 留言/评论统一表
 */
export const guestbookMessages = pgTable(
  'guestbook_messages',
  {
    id: serial('id').primaryKey(),
    userId: varchar('user_id', { length: 128 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    avatar: text('avatar'),
    body: text('body').notNull(),
    parentId: integer('parent_id'),
    postSlug: varchar('post_slug', { length: 128 }),
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
 * 通用点赞表
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
 * 数据看板快照
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
 * 单项产品级数据
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
 * 页面浏览量统计表
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

/**
 * 产品/项目表
 */
export const projects = pgTable(
  'projects',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 128 }).notNull().unique(),
    name: varchar('name', { length: 256 }).notNull(),
    category: varchar('category', { length: 32 }).notNull(),
    taglineEn: text('tagline_en').notNull().default(''),
    taglineZh: text('tagline_zh').notNull().default(''),
    descriptionEn: text('description_en').notNull().default(''),
    descriptionZh: text('description_zh').notNull().default(''),
    stack: text('stack').notNull().default('[]'),
    repo: text('repo'),
    live: text('live'),
    chromeStoreId: varchar('chrome_store_id', { length: 64 }),
    featured: integer('featured').notNull().default(0),
    pinned: integer('pinned').notNull().default(0),
    year: integer('year').notNull(),
    accent: varchar('accent', { length: 32 }),
    heroImage: text('hero_image'),
    gallery: text('gallery'),
    coverVideo: text('cover_video'),
    caseStudyEn: text('case_study_en'),
    caseStudyZh: text('case_study_zh'),
    colorTheme: varchar('color_theme', { length: 32 }),
    metrics: text('metrics'),
    changelog: text('changelog'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('projects_slug_idx').on(table.slug),
    index('projects_sort_idx').on(table.sortOrder),
  ]
);

/**
 * Now 页条目
 */
export const nowItems = pgTable(
  'now_items',
  {
    id: serial('id').primaryKey(),
    labelEn: varchar('label_en', { length: 256 }).notNull(),
    labelZh: varchar('label_zh', { length: 256 }).notNull(),
    valueEn: text('value_en').notNull(),
    valueZh: text('value_zh').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('now_items_sort_idx').on(table.sortOrder)]
);

/**
 * Now 页全局配置
 */
export const nowConfig = pgTable('now_config', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 64 }).notNull().unique(),
  value: text('value').notNull().default(''),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * 照片表
 */
export const photos = pgTable(
  'photos',
  {
    id: serial('id').primaryKey(),
    src: text('src').notNull(),
    alt: varchar('alt', { length: 512 }).notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    location: varchar('location', { length: 256 }),
    takenAt: date('taken_at').notNull(),
    storyEn: text('story_en'),
    storyZh: text('story_zh'),
    exif: text('exif'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('photos_sort_idx').on(table.sortOrder)]
);

/**
 * 时间线事件
 */
export const timelineEvents = pgTable(
  'timeline_events',
  {
    id: serial('id').primaryKey(),
    date: date('date').notNull(),
    titleEn: varchar('title_en', { length: 512 }).notNull(),
    titleZh: varchar('title_zh', { length: 512 }).notNull(),
    descriptionEn: text('description_en'),
    descriptionZh: text('description_zh'),
    type: varchar('type', { length: 32 }).notNull(),
    url: text('url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('timeline_date_idx').on(table.date)]
);

/**
 * Uses 分组
 */
export const usesSections = pgTable(
  'uses_sections',
  {
    id: serial('id').primaryKey(),
    sectionId: varchar('section_id', { length: 64 }).notNull().unique(),
    titleEn: varchar('title_en', { length: 256 }).notNull(),
    titleZh: varchar('title_zh', { length: 256 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('uses_sections_sort_idx').on(table.sortOrder)]
);

/**
 * Uses 子项
 */
export const usesItems = pgTable(
  'uses_items',
  {
    id: serial('id').primaryKey(),
    sectionId: integer('section_id').notNull(),
    name: varchar('name', { length: 256 }).notNull(),
    url: text('url'),
    noteEn: text('note_en').notNull().default(''),
    noteZh: text('note_zh').notNull().default(''),
    rating: integer('rating'),
    verdictEn: text('verdict_en'),
    verdictZh: text('verdict_zh'),
    since: varchar('since', { length: 10 }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('uses_items_section_idx').on(table.sectionId),
    index('uses_items_sort_idx').on(table.sortOrder),
  ]
);

/**
 * 社交链接
 */
export const socialLinks = pgTable(
  'social_links',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 128 }).notNull(),
    href: text('href').notNull(),
    iconName: varchar('icon_name', { length: 64 }).notNull(),
    handle: varchar('handle', { length: 256 }),
    isEmail: integer('is_email').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('social_links_sort_idx').on(table.sortOrder)]
);

/**
 * 热门博客榜
 */
export const popularPosts = pgTable('popular_posts', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 256 }).notNull().unique(),
  views: integer('views').notNull().default(0),
  trend: varchar('trend', { length: 16 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * 博客文章（数据库化）
 */
export const blogPosts = pgTable(
  'blog_posts',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 256 }).notNull(),
    title: varchar('title', { length: 512 }).notNull(),
    summary: text('summary'),
    content: text('content').notNull(),
    tags: text('tags').notNull().default('[]'),
    lang: varchar('lang', { length: 8 }).notNull().default('en'),
    draft: integer('draft').notNull().default(1),
    coverImage: text('cover_image'),
    source: varchar('source', { length: 32 }),
    sourceId: varchar('source_id', { length: 256 }),
    sourceUrl: text('source_url'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('blog_posts_slug_lang_idx').on(table.slug, table.lang),
    index('blog_posts_lang_idx').on(table.lang),
    index('blog_posts_published_idx').on(table.publishedAt),
    index('blog_posts_source_id_idx').on(table.sourceId),
  ]
);

/**
 * Newsletter 期刊记录
 */
export const newsletterIssues = pgTable(
  'newsletter_issues',
  {
    id: serial('id').primaryKey(),
    subject: varchar('subject', { length: 512 }).notNull(),
    previewText: text('preview_text'),
    htmlContent: text('html_content').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    recipientCount: integer('recipient_count').notNull().default(0),
    resendBroadcastId: varchar('resend_broadcast_id', { length: 128 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('newsletter_issues_sent_idx').on(table.sentAt)]
);

// ─── Type Exports ────────────────────────────────────────────────

export type GuestbookMessage = typeof guestbookMessages.$inferSelect;
export type NewGuestbookMessage = typeof guestbookMessages.$inferInsert;
export type StatsSnapshot = typeof statsSnapshot.$inferSelect;
export type ProductStat = typeof productStats.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type NewLike = typeof likes.$inferInsert;
export type LikeTargetType = 'message' | 'post';
export type PageView = typeof pageViews.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type NewProjectRow = typeof projects.$inferInsert;
export type NowItemRow = typeof nowItems.$inferSelect;
export type NewNowItemRow = typeof nowItems.$inferInsert;
export type NowConfigRow = typeof nowConfig.$inferSelect;
export type PhotoRow = typeof photos.$inferSelect;
export type NewPhotoRow = typeof photos.$inferInsert;
export type TimelineEventRow = typeof timelineEvents.$inferSelect;
export type NewTimelineEventRow = typeof timelineEvents.$inferInsert;
export type UsesSectionRow = typeof usesSections.$inferSelect;
export type NewUsesSectionRow = typeof usesSections.$inferInsert;
export type UsesItemRow = typeof usesItems.$inferSelect;
export type NewUsesItemRow = typeof usesItems.$inferInsert;
export type SocialLinkRow = typeof socialLinks.$inferSelect;
export type NewSocialLinkRow = typeof socialLinks.$inferInsert;
export type PopularPostRow = typeof popularPosts.$inferSelect;
export type NewPopularPostRow = typeof popularPosts.$inferInsert;
export type BlogPostRow = typeof blogPosts.$inferSelect;
export type NewBlogPostRow = typeof blogPosts.$inferInsert;
export type NewsletterIssueRow = typeof newsletterIssues.$inferSelect;
export type NewNewsletterIssueRow = typeof newsletterIssues.$inferInsert;
