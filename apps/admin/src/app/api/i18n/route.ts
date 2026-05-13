import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@repo/db';
import { i18nMessages } from '@repo/db/schema';
import { triggerRevalidation } from '@/lib/revalidate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/i18n?locale=en&namespace=common — 查询指定 locale 的所有 i18n 文案
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get('locale');
    const namespace = searchParams.get('namespace');

    if (!locale?.trim()) {
      return NextResponse.json({ error: 'locale query param is required' }, { status: 400 });
    }

    const conditions = [eq(i18nMessages.locale, locale.trim())];
    if (namespace?.trim()) {
      conditions.push(eq(i18nMessages.namespace, namespace.trim()));
    }

    const rows = await db
      .select()
      .from(i18nMessages)
      .where(and(...conditions));

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('[api/i18n] GET failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * POST /api/i18n — 创建或更新文案（upsert）
 * Body: { locale, namespace, key, value }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { locale, namespace, key, value } = body as {
      locale?: string;
      namespace?: string;
      key?: string;
      value?: string;
    };

    if (!locale?.trim() || !namespace?.trim() || !key?.trim() || value === undefined) {
      return NextResponse.json(
        { error: 'locale, namespace, key, and value are required' },
        { status: 400 },
      );
    }

    const [upserted] = await db
      .insert(i18nMessages)
      .values({
        locale: locale.trim(),
        namespace: namespace.trim(),
        key: key.trim(),
        value: value,
      })
      .onConflictDoUpdate({
        target: [i18nMessages.locale, i18nMessages.namespace, i18nMessages.key],
        set: {
          value: value,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Trigger main site cache invalidation (non-blocking)
    triggerRevalidation(['/']).catch(() => {});

    return NextResponse.json({ data: upserted }, { status: 201 });
  } catch (error) {
    console.error('[api/i18n] POST failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * PUT /api/i18n — 批量导入文案（upsert）
 * Body: { locale, messages: [{ namespace, key, value }] }
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { locale, messages } = body as {
      locale?: string;
      messages?: Array<{ namespace: string; key: string; value: string }>;
    };

    if (!locale?.trim()) {
      return NextResponse.json({ error: 'locale is required' }, { status: 400 });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'messages array is required and must not be empty' },
        { status: 400 },
      );
    }

    const results = await Promise.all(
      messages.map(async (msg) => {
        const [row] = await db
          .insert(i18nMessages)
          .values({
            locale: locale.trim(),
            namespace: msg.namespace.trim(),
            key: msg.key.trim(),
            value: msg.value,
          })
          .onConflictDoUpdate({
            target: [i18nMessages.locale, i18nMessages.namespace, i18nMessages.key],
            set: {
              value: msg.value,
              updatedAt: new Date(),
            },
          })
          .returning();
        return row;
      }),
    );

    // Trigger main site cache invalidation (non-blocking)
    triggerRevalidation(['/']).catch(() => {});

    return NextResponse.json({ data: results.filter(Boolean) });
  } catch (error) {
    console.error('[api/i18n] PUT failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * DELETE /api/i18n?id=xxx — 删除指定文案
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const [deleted] = await db.delete(i18nMessages).where(eq(i18nMessages.id, id)).returning();

    if (!deleted) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Trigger main site cache invalidation (non-blocking)
    triggerRevalidation(['/']).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/i18n] DELETE failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
