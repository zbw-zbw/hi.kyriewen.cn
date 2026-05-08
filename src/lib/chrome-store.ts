/**
 * 抓取 Chrome Web Store 产品页，解析用户数 & 评分。
 * Chrome Web Store 没有官方 API，走公共 HTML + 正则兜底。
 * 若页面结构变化，应尽快修这里。
 */
export interface ChromeStoreStats {
  users: number | null;
  rating: number | null;
  ratingCount: number | null;
}

export async function fetchChromeStoreStats(
  extensionId: string
): Promise<ChromeStoreStats | null> {
  if (!extensionId) return null;
  const url = `https://chromewebstore.google.com/detail/${extensionId}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 60 * 60 * 12 },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // 用户数："1,234 users" / "1K+ users" / "10,000+ users"
    const userMatch =
      html.match(/([\d,]+)\s*users?/i) ||
      html.match(/>(\d[\d,]*\+?)\s*users?</i);
    const users = userMatch?.[1]
      ? parseInt(userMatch[1].replace(/[^\d]/g, ''), 10)
      : null;

    // 评分："4.5 out of 5" / "ratingValue":"4.5"
    const ratingMatch =
      html.match(/"ratingValue":\s*"?([\d.]+)"?/) ||
      html.match(/([\d.]+)\s*out of\s*5/i);
    const rating = ratingMatch?.[1] ? parseFloat(ratingMatch[1]) : null;

    const ratingCountMatch =
      html.match(/"ratingCount":\s*"?([\d,]+)"?/) ||
      html.match(/([\d,]+)\s*ratings?/i);
    const ratingCount = ratingCountMatch?.[1]
      ? parseInt(ratingCountMatch[1].replace(/[^\d]/g, ''), 10)
      : null;

    return { users, rating, ratingCount };
  } catch (err) {
    console.error('[chrome-store] fetch failed', extensionId, err);
    return null;
  }
}
