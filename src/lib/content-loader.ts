/**
 * 统一内容加载器（兼容层）
 *
 * 优先从数据库读取，fallback 到原始 .ts 文件。
 * 通过环境变量 CONTENT_SOURCE 可强制切换数据源：
 * - 'db'   → 只读数据库
 * - 'file' → 只读文件（默认）
 * - 未设置 → 优先数据库，fallback 文件
 */

import { db } from '@/lib/db';
import {
  projects as projectsTable,
  nowItems as nowItemsTable,
  nowConfig as nowConfigTable,
  photos as photosTable,
  timelineEvents as timelineEventsTable,
  usesSections as usesSectionsTable,
  usesItems as usesItemsTable,
  socialLinks as socialLinksTable,
  popularPosts as popularPostsTable,
  navigationItems as navigationItemsTable,
  i18nMessages as i18nMessagesTable,
} from '@/lib/db';
import { asc, desc, eq } from 'drizzle-orm';

// ── File-based imports (fallback) ───────────────────────────────
import {
  PROJECTS as FILE_PROJECTS,
  getFeaturedProjects as fileFeaturedProjects,
  getPinnedProjects as filePinnedProjects,
  getProjectBySlug as fileGetProjectBySlug,
  type Project,
  type ProjectCategory,
} from '@/content/projects';
import {
  NOW_ITEMS as FILE_NOW_ITEMS,
  NOW_UPDATED_AT as FILE_NOW_UPDATED_AT,
  NOW_CURRENTLY_BUILDING as FILE_NOW_CURRENTLY_BUILDING,
  type NowItem,
} from '@/content/now';
import {
  PHOTOS as FILE_PHOTOS,
  getPhotosByYear as fileGetPhotosByYear,
  type Photo,
} from '@/content/photos';
import {
  TIMELINE as FILE_TIMELINE,
  getTimelineByYear as fileGetTimelineByYear,
  type TimelineEvent,
} from '@/content/timeline';
import { USES as FILE_USES, formatSince, type UsesSection, type UsesItem } from '@/content/uses';
import { SOCIAL_LINKS as FILE_SOCIAL_LINKS, type SocialLink } from '@/content/social';
import {
  POPULAR_POSTS as FILE_POPULAR_POSTS,
  getTopPosts as fileGetTopPosts,
  type PopularPost,
} from '@/content/popular';

// Re-export types for consumers
export type {
  Project,
  ProjectCategory,
  NowItem,
  Photo,
  TimelineEvent,
  UsesSection,
  UsesItem,
  SocialLink,
  PopularPost,
};
export { formatSince };

const source = process.env.CONTENT_SOURCE; // 'db' | 'file' | undefined

function shouldReadDb(): boolean {
  if (source === 'file') return false;
  if (source === 'db') return true;
  return true; // default: try db first, each function has try-catch fallback to file
}

// ═══════════════════════════════════════════════════════════════
// Projects
// ═══════════════════════════════════════════════════════════════

export async function getProjects(): Promise<Project[]> {
  if (!shouldReadDb()) return FILE_PROJECTS;
  try {
    const rows = await db.select().from(projectsTable).orderBy(asc(projectsTable.sortOrder));
    return rows.length > 0 ? rows.map(rowToProject) : FILE_PROJECTS;
  } catch {
    return FILE_PROJECTS;
  }
}

export async function getFeaturedProjects(): Promise<Project[]> {
  if (!shouldReadDb()) return fileFeaturedProjects();
  const all = await getProjects();
  return all.filter((p) => p.featured);
}

export async function getPinnedProjects(): Promise<Project[]> {
  if (!shouldReadDb()) return filePinnedProjects();
  const all = await getProjects();
  return all.filter((p) => p.pinned);
}

export async function getProjectBySlug(slug: string): Promise<Project | undefined> {
  if (!shouldReadDb()) return fileGetProjectBySlug(slug);
  const all = await getProjects();
  return all.find((p) => p.slug === slug);
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    slug: row.slug as string,
    name: row.name as string,
    category: row.category as ProjectCategory,
    tagline: { en: (row.taglineEn as string) ?? '', zh: (row.taglineZh as string) ?? '' },
    description: {
      en: (row.descriptionEn as string) ?? '',
      zh: (row.descriptionZh as string) ?? '',
    },
    stack: safeJsonParse(row.stack as string, []),
    repo: (row.repo as string) || undefined,
    live: (row.live as string) || undefined,
    chromeStoreId: (row.chromeStoreId as string) || undefined,
    featured: (row.featured as number) === 1,
    pinned: (row.pinned as number) === 1,
    year: row.year as number,
    accent: (row.accent as string) || undefined,
    heroImage: (row.heroImage as string) || undefined,
    gallery: row.gallery ? safeJsonParse(row.gallery as string, []) : undefined,
    coverVideo: (row.coverVideo as string) || undefined,
    caseStudy:
      row.caseStudyEn || row.caseStudyZh
        ? { en: (row.caseStudyEn as string) ?? '', zh: (row.caseStudyZh as string) ?? '' }
        : undefined,
    colorTheme: (row.colorTheme as string) || undefined,
    metrics: row.metrics ? safeJsonParse(row.metrics as string, undefined) : undefined,
    changelog: row.changelog ? safeJsonParse(row.changelog as string, undefined) : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════
// Now
// ═══════════════════════════════════════════════════════════════

export async function getNowItems(): Promise<NowItem[]> {
  if (!shouldReadDb()) return FILE_NOW_ITEMS;
  try {
    const rows = await db.select().from(nowItemsTable).orderBy(asc(nowItemsTable.sortOrder));
    if (rows.length === 0) return FILE_NOW_ITEMS;
    return rows.map((r) => ({
      label: { en: r.labelEn, zh: r.labelZh },
      value: { en: r.valueEn, zh: r.valueZh },
    }));
  } catch {
    return FILE_NOW_ITEMS;
  }
}

export async function getNowUpdatedAt(): Promise<string> {
  if (!shouldReadDb()) return FILE_NOW_UPDATED_AT;
  try {
    const rows = await db.select().from(nowConfigTable);
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return map['updated_at'] || FILE_NOW_UPDATED_AT;
  } catch {
    return FILE_NOW_UPDATED_AT;
  }
}

export async function getNowCurrentlyBuilding(): Promise<{ en: string; zh: string }> {
  if (!shouldReadDb()) return FILE_NOW_CURRENTLY_BUILDING;
  try {
    const rows = await db.select().from(nowConfigTable);
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      en: map['currently_building_en'] || FILE_NOW_CURRENTLY_BUILDING.en,
      zh: map['currently_building_zh'] || FILE_NOW_CURRENTLY_BUILDING.zh,
    };
  } catch {
    return FILE_NOW_CURRENTLY_BUILDING;
  }
}

// ═══════════════════════════════════════════════════════════════
// Photos
// ═══════════════════════════════════════════════════════════════

export async function getPhotos(): Promise<Photo[]> {
  if (!shouldReadDb()) return FILE_PHOTOS;
  try {
    const rows = await db.select().from(photosTable).orderBy(asc(photosTable.sortOrder));
    if (rows.length === 0) return FILE_PHOTOS;
    return rows.map((r) => ({
      src: r.src,
      alt: r.alt,
      width: r.width,
      height: r.height,
      location: r.location ?? undefined,
      takenAt: r.takenAt,
      story: r.storyEn || r.storyZh ? { en: r.storyEn ?? '', zh: r.storyZh ?? '' } : undefined,
      exif: r.exif ? safeJsonParse(r.exif, undefined) : undefined,
    }));
  } catch {
    return FILE_PHOTOS;
  }
}

export async function getPhotosByYear(): Promise<Array<{ year: number; photos: Photo[] }>> {
  if (!shouldReadDb()) return fileGetPhotosByYear();
  const photos = await getPhotos();
  const byYear = new Map<number, Photo[]>();
  for (const photo of photos) {
    const year = new Date(photo.takenAt).getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(photo);
  }
  return Array.from(byYear.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, p]) => ({ year, photos: p }));
}

// ═══════════════════════════════════════════════════════════════
// Timeline
// ═══════════════════════════════════════════════════════════════

export async function getTimeline(): Promise<TimelineEvent[]> {
  if (!shouldReadDb()) return FILE_TIMELINE;
  try {
    const rows = await db
      .select()
      .from(timelineEventsTable)
      .orderBy(desc(timelineEventsTable.date));
    if (rows.length === 0) return FILE_TIMELINE;
    return rows.map((r) => ({
      date: r.date,
      title: { en: r.titleEn, zh: r.titleZh },
      description:
        r.descriptionEn || r.descriptionZh
          ? { en: r.descriptionEn ?? '', zh: r.descriptionZh ?? '' }
          : undefined,
      type: r.type as TimelineEvent['type'],
      url: r.url ?? undefined,
    }));
  } catch {
    return FILE_TIMELINE;
  }
}

export async function getTimelineByYear(locale: 'en' | 'zh') {
  if (!shouldReadDb()) return fileGetTimelineByYear(locale);
  const timeline = await getTimeline();
  const grouped = new Map<number, TimelineEvent[]>();
  for (const event of timeline) {
    const year = new Date(event.date).getFullYear();
    const list = grouped.get(year) ?? [];
    list.push(event);
    grouped.set(year, list);
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, events]) => ({
      year,
      events: events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    }));
}

// ═══════════════════════════════════════════════════════════════
// Uses
// ═══════════════════════════════════════════════════════════════

export async function getUses(): Promise<UsesSection[]> {
  if (!shouldReadDb()) return FILE_USES;
  try {
    const sections = await db
      .select()
      .from(usesSectionsTable)
      .orderBy(asc(usesSectionsTable.sortOrder));
    if (sections.length === 0) return FILE_USES;
    const items = await db.select().from(usesItemsTable).orderBy(asc(usesItemsTable.sortOrder));

    return sections.map((s) => ({
      id: s.sectionId,
      title: { en: s.titleEn, zh: s.titleZh },
      items: items
        .filter((i) => i.sectionId === s.id)
        .map((i) => ({
          name: i.name,
          url: i.url ?? undefined,
          note: { en: i.noteEn, zh: i.noteZh },
          rating: i.rating as UsesItem['rating'],
          verdict:
            i.verdictEn || i.verdictZh
              ? { en: i.verdictEn ?? '', zh: i.verdictZh ?? '' }
              : undefined,
          since: i.since ?? undefined,
        })),
    }));
  } catch {
    return FILE_USES;
  }
}

// ═══════════════════════════════════════════════════════════════
// Social Links
// ═══════════════════════════════════════════════════════════════

export async function getSocialLinks(): Promise<SocialLink[]> {
  if (!shouldReadDb()) return FILE_SOCIAL_LINKS;
  try {
    const { Github, Twitter, Mail, Rss } = await import('lucide-react');
    const iconMap: Record<string, typeof Github> = {
      Github,
      Twitter,
      Mail,
      Rss,
    };
    const rows = await db.select().from(socialLinksTable).orderBy(asc(socialLinksTable.sortOrder));
    if (rows.length === 0) return FILE_SOCIAL_LINKS;
    return rows.map((r) => ({
      name: r.name,
      href: r.href,
      Icon: iconMap[r.iconName] ?? Mail,
      handle: r.handle ?? undefined,
      isEmail: r.isEmail === 1,
    }));
  } catch {
    return FILE_SOCIAL_LINKS;
  }
}

// ═══════════════════════════════════════════════════════════════
// Popular Posts
// ═══════════════════════════════════════════════════════════════

export async function getPopularPosts(): Promise<PopularPost[]> {
  if (!shouldReadDb()) return FILE_POPULAR_POSTS;
  try {
    const rows = await db.select().from(popularPostsTable).orderBy(desc(popularPostsTable.views));
    if (rows.length === 0) return FILE_POPULAR_POSTS;
    return rows.map((r) => ({
      slug: r.slug,
      views: r.views,
      trend: r.trend as PopularPost['trend'],
    }));
  } catch {
    return FILE_POPULAR_POSTS;
  }
}

export async function getTopPosts(n = 5): Promise<PopularPost[]> {
  if (!shouldReadDb()) return fileGetTopPosts(n);
  const all = await getPopularPosts();
  return all.slice(0, n);
}

// ── Helpers ─────────────────────────────────────────────────────

function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

// ═══════════════════════════════════════════════════════════════
// Navigation Items
// ═══════════════════════════════════════════════════════════════

/** 本地 fallback 导航数据 */
const FILE_NAV_ITEMS: NavigationItem[] = [
  { href: '/', key: 'home', sortOrder: 0, visible: true },
  { href: '/projects', key: 'projects', sortOrder: 1, visible: true },
  { href: '/blog', key: 'blog', sortOrder: 2, visible: true },
  { href: '/now', key: 'now', sortOrder: 3, visible: true },
  { href: '/guestbook', key: 'guestbook', sortOrder: 4, visible: true },
  { href: '/photos', key: 'photos', sortOrder: 5, visible: true },
  { href: '/stats', key: 'stats', sortOrder: 6, visible: true },
  { href: '/timeline', key: 'timeline', sortOrder: 7, visible: true },
  { href: '/uses', key: 'uses', sortOrder: 8, visible: true },
  { href: '/subscribe', key: 'subscribe', sortOrder: 9, visible: true },
];

export interface NavigationItem {
  href: string;
  key: string;
  sortOrder: number;
  visible: boolean;
}

export async function getNavigationItems(): Promise<NavigationItem[]> {
  if (!shouldReadDb()) return FILE_NAV_ITEMS;
  try {
    const rows = await db
      .select()
      .from(navigationItemsTable)
      .orderBy(asc(navigationItemsTable.sortOrder));
    if (rows.length === 0) return FILE_NAV_ITEMS;
    return rows.map((r) => ({
      href: r.href,
      key: r.key,
      sortOrder: r.sortOrder,
      visible: r.visible === 1,
    }));
  } catch {
    return FILE_NAV_ITEMS;
  }
}

// ═══════════════════════════════════════════════════════════════
// i18n Message Overrides
// ═══════════════════════════════════════════════════════════════

/**
 * 从数据库读取指定 locale 的 i18n 覆盖文案。
 * 返回一个嵌套对象结构，可与本地 JSON 做深度合并。
 */
export async function getI18nOverrides(locale: string): Promise<Record<string, unknown>> {
  if (!shouldReadDb()) return {};
  try {
    const rows = await db
      .select()
      .from(i18nMessagesTable)
      .where(eq(i18nMessagesTable.locale, locale));
    if (rows.length === 0) return {};

    // 将扁平的 namespace + key 转换为嵌套对象
    // e.g. { namespace: 'home', key: 'hero.eyebrow', value: '...' }
    //   → { home: { hero: { eyebrow: '...' } } }
    const result: Record<string, unknown> = {};
    for (const row of rows) {
      const path = `${row.namespace}.${row.key}`;
      setNestedValue(result, path, row.value);
    }
    return result;
  } catch {
    return {};
  }
}

/** 通过点分路径设置嵌套对象值 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]!;
    if (!(k in current) || typeof current[k] !== 'object' || current[k] === null) {
      current[k] = {};
    }
    current = current[k] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]!] = value;
}
