/**
 * 触发主站按需缓存失效
 * 在 admin 写操作（POST/PATCH/DELETE）成功后调用
 */
export async function triggerRevalidation(paths: string[]) {
  const mainSiteUrl = process.env.MAIN_SITE_URL ?? 'https://hi.kyriewen.cn';
  const secret = process.env.CRON_SECRET ?? '';

  if (!secret) {
    console.warn('[revalidate] CRON_SECRET not set, skipping revalidation');
    return;
  }

  try {
    const res = await fetch(`${mainSiteUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, paths }),
    });

    if (!res.ok) {
      console.error('[revalidate] failed', res.status, await res.text().catch(() => ''));
    }
  } catch (error) {
    // Non-blocking: don't let revalidation failure break the admin operation
    console.error('[revalidate] network error', error);
  }
}
