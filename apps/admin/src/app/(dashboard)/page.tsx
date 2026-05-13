import { db } from '@repo/db';
import {
  guestbookMessages,
  statsSnapshot,
  pageViews,
  blogPosts,
  projects,
  newsletterIssues,
} from '@repo/db/schema';
import { desc, count, sql, eq } from 'drizzle-orm';
import { DashboardContent } from './dashboard-content';

async function getStats() {
  try {
    const [messageCount] = await db.select({ count: count() }).from(guestbookMessages);

    const [viewCount] = await db
      .select({ total: sql<number>`coalesce(sum(${pageViews.views}), 0)` })
      .from(pageViews);

    const [postCount] = await db.select({ count: count() }).from(blogPosts);

    const [publishedPostCount] = await db
      .select({ count: count() })
      .from(blogPosts)
      .where(eq(blogPosts.draft, 0));

    const [projectCount] = await db.select({ count: count() }).from(projects);

    const [newsletterCount] = await db.select({ count: count() }).from(newsletterIssues);

    const latestSnapshot = await db
      .select()
      .from(statsSnapshot)
      .orderBy(desc(statsSnapshot.date))
      .limit(1);

    return {
      messages: messageCount?.count ?? 0,
      totalViews: viewCount?.total ?? 0,
      posts: postCount?.count ?? 0,
      publishedPosts: publishedPostCount?.count ?? 0,
      projects: projectCount?.count ?? 0,
      newsletters: newsletterCount?.count ?? 0,
      snapshot: latestSnapshot[0] ?? null,
    };
  } catch {
    return {
      messages: 0,
      totalViews: 0,
      posts: 0,
      publishedPosts: 0,
      projects: 0,
      newsletters: 0,
      snapshot: null,
    };
  }
}

export default async function DashboardPage() {
  const stats = await getStats();

  return <DashboardContent stats={stats} />;
}
