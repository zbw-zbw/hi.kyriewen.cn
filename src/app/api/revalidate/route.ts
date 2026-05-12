import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/revalidate — 按需缓存失效
 * Body: { secret: string, paths: string[] }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { secret, paths } = body as { secret?: string; paths?: string[] };

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || secret !== cronSecret) {
      return NextResponse.json({ error: 'invalid_secret' }, { status: 401 });
    }

    if (!Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: 'paths_required' }, { status: 400 });
    }

    for (const p of paths) {
      revalidatePath(p, 'layout');
    }

    return NextResponse.json({ revalidated: true, paths });
  } catch (error) {
    console.error('[api/revalidate] failed', error);
    return NextResponse.json({ error: 'revalidation_failed' }, { status: 500 });
  }
}
