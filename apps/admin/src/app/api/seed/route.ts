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
  | 'popular';

const ALL_TABLES: SeedTable[] = [
  'projects',
  'now',
  'photos',
  'timeline',
  'uses',
  'social',
  'popular',
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
        default:
          results[table] = -1; // unknown table
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error('[seed] error', err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
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
