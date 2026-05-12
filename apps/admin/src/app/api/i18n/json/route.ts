import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface FlatMessage {
  namespace: string;
  key: string;
  value: string;
}

/**
 * 递归扁平化嵌套 JSON 对象为 namespace.key → value 的数组
 */
function flattenMessages(obj: Record<string, unknown>, parentKey = ''): FlatMessage[] {
  const results: FlatMessage[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      results.push(...flattenMessages(value as Record<string, unknown>, fullKey));
    } else {
      // 拆分为 namespace（第一级）和 key（其余层级）
      const dotIndex = fullKey.indexOf('.');
      if (dotIndex > 0) {
        results.push({
          namespace: fullKey.slice(0, dotIndex),
          key: fullKey.slice(dotIndex + 1),
          value: String(value ?? ''),
        });
      } else {
        results.push({
          namespace: '_root',
          key: fullKey,
          value: String(value ?? ''),
        });
      }
    }
  }

  return results;
}

/**
 * GET /api/i18n/json?locale=zh — 读取主项目 src/messages/{locale}.json 并返回扁平化的文案列表
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get('locale') || 'zh';

    // 从 monorepo 根目录的 src/messages 读取
    const messagesPath = join(process.cwd(), '..', '..', 'src', 'messages', `${locale}.json`);

    const content = await readFile(messagesPath, 'utf-8');
    const json = JSON.parse(content) as Record<string, unknown>;
    const flatMessages = flattenMessages(json);

    return NextResponse.json({ data: flatMessages });
  } catch (error) {
    console.error('[api/i18n/json] GET failed', error);
    return NextResponse.json({ error: 'Failed to read JSON messages file' }, { status: 500 });
  }
}
