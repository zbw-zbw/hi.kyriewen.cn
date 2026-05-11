import { NextResponse } from 'next/server';
import { db } from '@repo/db';
import {
  projects,
  nowItems,
  nowConfig,
  photos,
  timelineEvents,
  usesSections,
  usesItems,
  socialLinks,
  popularPosts,
  navigationItems,
  i18nMessages,
} from '@repo/db/schema';
// drizzle-orm utilities imported as needed

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── Content file imports ─────────────────────────────────────────
import { PROJECTS } from '../../../../../../src/content/projects';
import {
  NOW_ITEMS,
  NOW_UPDATED_AT,
  NOW_CURRENTLY_BUILDING,
} from '../../../../../../src/content/now';
import { PHOTOS } from '../../../../../../src/content/photos';
import { TIMELINE } from '../../../../../../src/content/timeline';
import { USES } from '../../../../../../src/content/uses';
import { SOCIAL_LINKS } from '../../../../../../src/content/social';
import { POPULAR_POSTS } from '../../../../../../src/content/popular';

type SeedTable =
  | 'projects'
  | 'now'
  | 'photos'
  | 'timeline'
  | 'uses'
  | 'social'
  | 'popular'
  | 'navigation'
  | 'i18n';

const ALL_TABLES: SeedTable[] = [
  'projects',
  'now',
  'photos',
  'timeline',
  'uses',
  'social',
  'popular',
  'navigation',
  'i18n',
];

/**
 * POST /api/seed — 批量导入 content/*.ts 到数据库
 *
 * Body: { tables?: string[] }  — 不传则导入全部
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      tables?: string[];
    };
    const tables = (body.tables ?? ALL_TABLES) as SeedTable[];
    const results: Record<string, number> = {};

    for (const table of tables) {
      switch (table) {
        case 'projects':
          results.projects = await seedProjects();
          break;
        case 'now':
          results.now = await seedNow();
          break;
        case 'photos':
          results.photos = await seedPhotos();
          break;
        case 'timeline':
          results.timeline = await seedTimeline();
          break;
        case 'uses':
          results.uses = await seedUses();
          break;
        case 'social':
          results.social = await seedSocial();
          break;
        case 'popular':
          results.popular = await seedPopular();
          break;
        case 'navigation':
          results.navigation = await seedNavigation();
          break;
        case 'i18n':
          results.i18n = await seedI18n();
          break;
        default:
          results[table] = -1; // unknown table
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error('[seed] error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════
// Seed functions
// ═══════════════════════════════════════════════════════════════

async function seedProjects(): Promise<number> {
  await db.delete(projects);
  const rows = PROJECTS.map((p, i) => ({
    slug: p.slug,
    name: p.name,
    category: p.category,
    taglineEn: p.tagline.en,
    taglineZh: p.tagline.zh,
    descriptionEn: p.description.en,
    descriptionZh: p.description.zh,
    stack: JSON.stringify(p.stack),
    repo: p.repo ?? null,
    live: p.live ?? null,
    chromeStoreId: p.chromeStoreId ?? null,
    featured: p.featured ? 1 : 0,
    pinned: p.pinned ? 1 : 0,
    year: p.year,
    accent: p.accent ?? null,
    heroImage: p.heroImage ?? null,
    gallery: p.gallery ? JSON.stringify(p.gallery) : null,
    coverVideo: p.coverVideo ?? null,
    caseStudyEn: p.caseStudy?.en ?? null,
    caseStudyZh: p.caseStudy?.zh ?? null,
    colorTheme: p.colorTheme ?? null,
    metrics: p.metrics ? JSON.stringify(p.metrics) : null,
    changelog: p.changelog ? JSON.stringify(p.changelog) : null,
    sortOrder: i,
  }));
  await db.insert(projects).values(rows);
  return rows.length;
}

async function seedNow(): Promise<number> {
  await db.delete(nowItems);
  await db.delete(nowConfig);

  // Items
  const itemRows = NOW_ITEMS.map((item, i) => ({
    labelEn: item.label.en,
    labelZh: item.label.zh,
    valueEn: item.value.en,
    valueZh: item.value.zh,
    sortOrder: i,
  }));
  await db.insert(nowItems).values(itemRows);

  // Config
  const configRows = [
    { key: 'updated_at', value: NOW_UPDATED_AT },
    { key: 'currently_building_en', value: NOW_CURRENTLY_BUILDING.en },
    { key: 'currently_building_zh', value: NOW_CURRENTLY_BUILDING.zh },
  ];
  await db.insert(nowConfig).values(configRows);

  return itemRows.length + configRows.length;
}

async function seedPhotos(): Promise<number> {
  await db.delete(photos);
  const rows = PHOTOS.map((p, i) => ({
    src: p.src,
    alt: p.alt,
    width: p.width,
    height: p.height,
    location: p.location ?? null,
    takenAt: p.takenAt,
    storyEn: p.story?.en ?? null,
    storyZh: p.story?.zh ?? null,
    exif: p.exif ? JSON.stringify(p.exif) : null,
    sortOrder: i,
  }));
  await db.insert(photos).values(rows);
  return rows.length;
}

async function seedTimeline(): Promise<number> {
  await db.delete(timelineEvents);
  const rows = TIMELINE.map((e) => ({
    date: e.date,
    titleEn: e.title.en,
    titleZh: e.title.zh,
    descriptionEn: e.description?.en ?? null,
    descriptionZh: e.description?.zh ?? null,
    type: e.type,
    url: e.url ?? null,
  }));
  await db.insert(timelineEvents).values(rows);
  return rows.length;
}

async function seedUses(): Promise<number> {
  await db.delete(usesItems);
  await db.delete(usesSections);

  let totalItems = 0;

  for (let si = 0; si < USES.length; si++) {
    const section = USES[si]!;
    // Insert section and get the auto-generated id
    const [inserted] = await db
      .insert(usesSections)
      .values({
        sectionId: section.id,
        titleEn: section.title.en,
        titleZh: section.title.zh,
        sortOrder: si,
      })
      .returning({ id: usesSections.id });

    const sectionDbId = inserted!.id;

    // Insert items for this section
    const itemRows = section.items.map((item, ii) => ({
      sectionId: sectionDbId,
      name: item.name,
      url: item.url ?? null,
      noteEn: item.note.en,
      noteZh: item.note.zh,
      rating: item.rating ?? null,
      verdictEn: item.verdict?.en ?? null,
      verdictZh: item.verdict?.zh ?? null,
      since: item.since ?? null,
      sortOrder: ii,
    }));

    if (itemRows.length > 0) {
      await db.insert(usesItems).values(itemRows);
    }
    totalItems += itemRows.length;
  }

  return USES.length + totalItems;
}

async function seedSocial(): Promise<number> {
  await db.delete(socialLinks);

  // Map LucideIcon component → icon name string
  const iconMap: Record<string, string> = {
    Github: 'Github',
    Twitter: 'Twitter',
    Mail: 'Mail',
    Rss: 'Rss',
  };

  const rows = SOCIAL_LINKS.map((link, i) => ({
    name: link.name,
    href: link.href,
    iconName: iconMap[link.Icon.displayName ?? ''] ?? link.name,
    handle: link.handle ?? null,
    isEmail: link.isEmail ? 1 : 0,
    sortOrder: i,
  }));
  await db.insert(socialLinks).values(rows);
  return rows.length;
}

async function seedPopular(): Promise<number> {
  await db.delete(popularPosts);
  const rows = POPULAR_POSTS.map((p) => ({
    slug: p.slug,
    views: p.views,
    trend: p.trend ?? null,
  }));
  await db.insert(popularPosts).values(rows);
  return rows.length;
}

// ── Navigation ───────────────────────────────────────────────────

const NAVIGATION_ENTRIES: Array<{ href: string; key: string }> = [
  { href: '/', key: 'home' },
  { href: '/projects', key: 'projects' },
  { href: '/blog', key: 'blog' },
  { href: '/now', key: 'now' },
  { href: '/guestbook', key: 'guestbook' },
  { href: '/photos', key: 'photos' },
  { href: '/stats', key: 'stats' },
  { href: '/timeline', key: 'timeline' },
  { href: '/uses', key: 'uses' },
  { href: '/subscribe', key: 'subscribe' },
];

async function seedNavigation(): Promise<number> {
  await db.delete(navigationItems);
  const rows = NAVIGATION_ENTRIES.map((entry, index) => ({
    href: entry.href,
    key: entry.key,
    visible: 1,
    sortOrder: index,
  }));
  await db.insert(navigationItems).values(rows);
  return rows.length;
}

// ── i18n Messages ────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Recursively flatten a nested JSON object into { namespace, key, value } entries.
 *
 * Example:
 *   { "home": { "hero": { "eyebrow": "xxx" } } }
 *   → { namespace: "home", key: "hero.eyebrow", value: "xxx" }
 */
function flattenMessages(
  obj: Record<string, unknown>,
  parentKey = '',
): Array<{ namespace: string; key: string; value: string }> {
  const results: Array<{ namespace: string; key: string; value: string }> = [];

  for (const [currentKey, currentValue] of Object.entries(obj)) {
    if (typeof currentValue === 'object' && currentValue !== null && !Array.isArray(currentValue)) {
      // Recurse into nested object
      const nested = flattenMessages(
        currentValue as Record<string, unknown>,
        parentKey ? `${parentKey}.${currentKey}` : currentKey,
      );
      results.push(...nested);
    } else {
      // Leaf value — extract namespace (first segment) and remaining key
      const fullPath = parentKey ? `${parentKey}.${currentKey}` : currentKey;
      const dotIndex = fullPath.indexOf('.');
      const namespace = dotIndex === -1 ? fullPath : fullPath.slice(0, dotIndex);
      const leafKey = dotIndex === -1 ? '' : fullPath.slice(dotIndex + 1);

      results.push({
        namespace,
        key: leafKey,
        value: String(currentValue),
      });
    }
  }

  return results;
}

async function seedI18n(): Promise<number> {
  await db.delete(i18nMessages);

  const projectRoot = join(process.cwd(), '..', '..');
  const locales = ['zh', 'en'] as const;
  const allRows: Array<{
    locale: string;
    namespace: string;
    key: string;
    value: string;
  }> = [];

  for (const locale of locales) {
    const filePath = join(projectRoot, 'src', 'messages', `${locale}.json`);
    const raw = readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw) as Record<string, unknown>;
    const entries = flattenMessages(json);

    for (const entry of entries) {
      allRows.push({
        locale,
        namespace: entry.namespace,
        key: entry.key,
        value: entry.value,
      });
    }
  }

  // Batch insert in chunks of 100 to avoid overly large statements
  const chunkSize = 100;
  for (let offset = 0; offset < allRows.length; offset += chunkSize) {
    const chunk = allRows.slice(offset, offset + chunkSize);
    await db.insert(i18nMessages).values(chunk);
  }

  return allRows.length;
}
