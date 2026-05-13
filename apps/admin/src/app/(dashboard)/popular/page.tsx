import { db } from '@repo/db';
import { popularPosts, blogPosts, pageViews } from '@repo/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { PopularManager } from './popular-manager';

export default async function PopularPostsPage() {
  const posts = await db.select().from(popularPosts).orderBy(desc(popularPosts.views));

  // 服务端预加载博客文章列表（避免客户端异步 fetch 导致 title 闪烁）
  const allBlogPosts = await db
    .select({
      slug: blogPosts.slug,
      title: blogPosts.title,
      lang: blogPosts.lang,
    })
    .from(blogPosts)
    .where(eq(blogPosts.draft, 0))
    .orderBy(desc(blogPosts.updatedAt));

  // 服务端预加载浏览量数据（避免客户端请求主站 /api/views 导致 404）
  const slugList = posts.map((p) => `blog/${p.slug}`);
  let viewsMap: Record<string, number> = {};
  if (slugList.length > 0) {
    const viewRows = await db
      .select({ slug: pageViews.slug, views: pageViews.views })
      .from(pageViews)
      .where(inArray(pageViews.slug, slugList));
    viewsMap = Object.fromEntries(viewRows.map((r) => [r.slug, r.views]));
  }

  return (
    <PopularManager
      initialData={JSON.parse(JSON.stringify(posts))}
      initialBlogPosts={allBlogPosts}
      initialViewsMap={viewsMap}
    />
  );
}
