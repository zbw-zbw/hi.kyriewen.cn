import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, guestbookMessages } from '@/lib/db';
import { getRateLimiter } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const messages = await db
      .select()
      .from(guestbookMessages)
      .orderBy(desc(guestbookMessages.createdAt))
      .limit(100);
    return NextResponse.json({ messages });
  } catch (err) {
    console.error('[guestbook] list error', err);
    return NextResponse.json({ messages: [], error: 'db_unavailable' });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { body } = (await req.json()) as { body?: string };
  const trimmed = body?.trim();
  if (!trimmed) {
    return NextResponse.json({ error: 'empty' }, { status: 400 });
  }
  if (trimmed.length > 500) {
    return NextResponse.json({ error: 'too_long' }, { status: 400 });
  }

  // 限流：每用户 60s 一条
  const limiter = getRateLimiter();
  if (limiter) {
    const { success } = await limiter.limit(session.user.id);
    if (!success) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }
  }

  try {
    const [row] = await db
      .insert(guestbookMessages)
      .values({
        userId: session.user.id,
        name: session.user.name ?? session.user.login ?? 'anonymous',
        avatar: session.user.image ?? null,
        body: trimmed,
      })
      .returning();
    return NextResponse.json({ message: row });
  } catch (err) {
    console.error('[guestbook] insert error', err);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
