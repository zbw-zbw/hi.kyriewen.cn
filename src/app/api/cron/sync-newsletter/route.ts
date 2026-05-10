import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { statsSnapshot } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorize(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

/**
 * GET /api/cron/sync-newsletter
 *
 * 每日从 Resend API 拉取 Audience 订阅者数量，
 * 写入 stats_snapshot.newsletter_subscribers。
 */
export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  if (!apiKey || !audienceId) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'RESEND_API_KEY or RESEND_AUDIENCE_ID not configured',
    });
  }

  try {
    // Fetch audience contacts count from Resend
    const res = await fetch(
      `https://api.resend.com/audiences/${audienceId}/contacts`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[cron:sync-newsletter] Resend API error', res.status, text);
      return NextResponse.json(
        { error: 'Resend API error', status: res.status },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { data: Array<{ id: string }> };
    const subscriberCount = data.data?.length ?? 0;
    const today = new Date().toISOString().slice(0, 10);

    // Upsert into stats_snapshot
    await db
      .insert(statsSnapshot)
      .values({
        date: today,
        newsletterSubscribers: subscriberCount,
        githubStars: 0,
        githubFollowers: 0,
        chromeTotalUsers: 0,
      })
      .onConflictDoUpdate({
        target: statsSnapshot.date,
        set: {
          newsletterSubscribers: subscriberCount,
        },
      });

    return NextResponse.json({
      ok: true,
      subscriberCount,
      updatedAt: today,
    });
  } catch (err) {
    console.error('[cron:sync-newsletter] error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
