import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@repo/db';
import { navigationItems } from '@repo/db/schema';
import { triggerRevalidation } from '@/lib/revalidate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/navigation — 查询所有导航项，按 sortOrder 升序
 */
export async function GET() {
  try {
    const rows = await db.select().from(navigationItems).orderBy(asc(navigationItems.sortOrder));

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('[api/navigation] GET failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * POST /api/navigation — 新建导航项
 * Body: { href, key, visible?, sortOrder? }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { href, key, labelEn, labelZh, visible, sortOrder } = body as {
      href?: string;
      key?: string;
      labelEn?: string;
      labelZh?: string;
      visible?: number;
      sortOrder?: number;
    };

    if (!href?.trim() || !key?.trim()) {
      return NextResponse.json({ error: 'href and key are required' }, { status: 400 });
    }

    const [created] = await db
      .insert(navigationItems)
      .values({
        href: href.trim(),
        key: key.trim(),
        labelEn: labelEn?.trim() ?? '',
        labelZh: labelZh?.trim() ?? '',
        visible: visible ?? 1,
        sortOrder: sortOrder ?? 0,
      })
      .returning();

    // Trigger main site cache invalidation (non-blocking)
    triggerRevalidation(['/']).catch(() => {});

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('[api/navigation] POST failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * PUT /api/navigation — 批量更新排序和可见性
 * Body: { items: [{ id, sortOrder, visible }] }
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { items } = body as {
      items?: Array<{ id: number; sortOrder?: number; visible?: number }>;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items array is required and must not be empty' },
        { status: 400 },
      );
    }

    const updated = await Promise.all(
      items.map(async (item) => {
        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (item.sortOrder !== undefined) updates.sortOrder = item.sortOrder;
        if (item.visible !== undefined) updates.visible = item.visible;

        const [row] = await db
          .update(navigationItems)
          .set(updates)
          .where(eq(navigationItems.id, item.id))
          .returning();
        return row;
      }),
    );

    return NextResponse.json({ data: updated.filter(Boolean) });
  } catch (error) {
    console.error('[api/navigation] PUT failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * DELETE /api/navigation?id=xxx — 删除指定导航项
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const [deleted] = await db
      .delete(navigationItems)
      .where(eq(navigationItems.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/navigation] DELETE failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
