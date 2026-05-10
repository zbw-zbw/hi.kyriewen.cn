import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db } from '@repo/db';
import { socialLinks } from '@repo/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/social — 查询所有 socialLinks，按 sortOrder 排序
 */
export async function GET() {
  try {
    const rows = await db
      .select()
      .from(socialLinks)
      .orderBy(asc(socialLinks.sortOrder));

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('[api/social] GET failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * POST /api/social — 新建 socialLink
 * Body: { name, href, iconName, handle?, isEmail?, sortOrder? }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, href, iconName, handle, isEmail, sortOrder } = body as {
      name?: string;
      href?: string;
      iconName?: string;
      handle?: string;
      isEmail?: number;
      sortOrder?: number;
    };

    if (!name?.trim() || !href?.trim() || !iconName?.trim()) {
      return NextResponse.json(
        { error: 'name, href, and iconName are required' },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(socialLinks)
      .values({
        name: name.trim(),
        href: href.trim(),
        iconName: iconName.trim(),
        handle: handle?.trim() || null,
        isEmail: isEmail ?? 0,
        sortOrder: sortOrder ?? 0,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('[api/social] POST failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
