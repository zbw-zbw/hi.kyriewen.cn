import { db } from '@repo/db';
import { popularPosts } from '@repo/db/schema';
import { desc } from 'drizzle-orm';
import { PopularManager } from './popular-manager';

export default async function PopularPostsPage() {
  const posts = await db
    .select()
    .from(popularPosts)
    .orderBy(desc(popularPosts.views));

  return <PopularManager initialData={JSON.parse(JSON.stringify(posts))} />;
}
