import { getAllPosts } from '@/lib/blog';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hi.kyriewen.cn';

function escapeXml(unsafe: string) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

export async function GET() {
  const enPosts = getAllPosts('en');
  const zhPosts = getAllPosts('zh');
  const allPosts = [
    ...enPosts.map((p) => ({ ...p, url: `${SITE_URL}/blog/${p.slug}` })),
    ...zhPosts.map((p) => ({ ...p, url: `${SITE_URL}/zh/blog/${p.slug}` })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const items = allPosts
    .map(
      (p) => `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${p.url}</link>
      <guid isPermaLink="true">${p.url}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${escapeXml(p.summary)}</description>
      ${p.tags?.map((t) => `<category>${escapeXml(t)}</category>`).join('') ?? ''}
    </item>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Kyriewen</title>
    <link>${SITE_URL}</link>
    <description>Indie hacker · Frontend developer · Chrome extension builder.</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
