import { NextResponse } from 'next/server';
import { translateText, translateBatch } from '@/lib/translate';
import type { TranslateFieldType } from '@/lib/translate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TranslateItem {
  text: string;
  type?: TranslateFieldType;
  field?: string; // optional field name for response mapping
}

/**
 * POST /api/translate
 * Body: { texts: TranslateItem[] }
 * Returns: { results: { field?: string, original: string, translated: string }[] }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { texts } = body as { texts: TranslateItem[] };

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { error: 'texts array is required' },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse
    if (texts.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 texts per request' },
        { status: 400 }
      );
    }

    const results = await translateBatch(
      texts.map((t) => ({ text: t.text, type: t.type }))
    );

    // Attach field names back to results
    const response = results.map((r, i) => ({
      field: texts[i]?.field,
      original: r.original,
      translated: r.translated,
    }));

    return NextResponse.json({ results: response });
  } catch (error) {
    console.error('[translate] Error:', error);
    return NextResponse.json(
      {
        error: 'Translation failed',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
