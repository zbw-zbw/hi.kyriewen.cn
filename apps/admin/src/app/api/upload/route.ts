import { NextResponse } from 'next/server';
import { uploadFile, generateKey } from '@repo/storage';
import { requireAdmin } from '@/lib/guard';

/**
 * SVG 不在白名单内：SVG 是可执行文档（内嵌 <script> / on* 事件），
 * 上传后从 cdn.kyriewen.cn 直开就是一个存储型 XSS 落地点。
 */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

/** 每种 MIME 对应的规范扩展名 —— 不使用用户文件名里的后缀 */
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

/** prefix 会直接拼成 R2 object key，只允许前端实际使用的几个值 */
const ALLOWED_PREFIXES: readonly string[] = ['uploads', 'photos', 'projects', 'blog'];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const prefix = (formData.get('prefix') as string) || 'uploads';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_PREFIXES.includes(prefix)) {
      return NextResponse.json({ error: `Invalid prefix: ${prefix}` }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max: ${MAX_SIZE / 1024 / 1024}MB` },
        { status: 400 },
      );
    }

    // 扩展名由校验过的 MIME 推导，避开用户文件名里的任意后缀
    const key = generateKey(prefix, `image.${EXT_BY_TYPE[file.type]}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadFile(key, buffer, file.type);

    return NextResponse.json({ url, key });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 },
    );
  }
}
