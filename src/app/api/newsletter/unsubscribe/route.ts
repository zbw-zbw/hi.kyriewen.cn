import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 一键退订接口：
 *
 *   GET  /api/newsletter/unsubscribe?email=xxx&token=xxx
 *
 * token = HMAC-SHA256(email, NEWSLETTER_UNSUBSCRIBE_SECRET) 的 hex 前 32 位。
 * 邮件模板里发链接时，由 server 端生成同样规则的 token 嵌入。
 *
 * 设计要点：
 * - GET 而非 POST：邮件客户端点击即生效，无需 JS
 * - 校验 token 防止恶意退订他人邮箱
 * - Resend Audience contact 实际删除走 PATCH unsubscribed=true（保留记录用于反订阅检测）
 * - 未配置 Resend 时返回 ok=true（dev 友好）
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signEmail(email: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(email.toLowerCase().trim())
    .digest('hex')
    .slice(0, 32);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get('email');
  const token = url.searchParams.get('token');

  if (!email || !EMAIL_RE.test(email) || !token) {
    return new NextResponse(renderHtml('error', email ?? '', 'Invalid link'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const secret = process.env.NEWSLETTER_UNSUBSCRIBE_SECRET;
  if (!secret) {
    console.warn('[unsubscribe] NEWSLETTER_UNSUBSCRIBE_SECRET missing');
    // dev 友好：缺 secret 时直接当成功
    return new NextResponse(renderHtml('success', email), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const expected = signEmail(email, secret);
  // 时间安全比较，防 timing attack
  const tokenBuf = Buffer.from(token);
  const expBuf = Buffer.from(expected);
  if (
    tokenBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(tokenBuf, expBuf)
  ) {
    return new NextResponse(renderHtml('error', email, 'Invalid token'), {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // 实际从 Resend Audience 移除（PATCH unsubscribed=true）
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (apiKey && audienceId) {
    try {
      const res = await fetch(
        `https://api.resend.com/audiences/${audienceId}/contacts/${encodeURIComponent(email)}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ unsubscribed: true }),
        }
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.warn('[unsubscribe] resend PATCH failed', res.status, txt);
      }
    } catch (err) {
      console.error('[unsubscribe] resend fetch error', err);
    }
  }

  return new NextResponse(renderHtml('success', email), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function renderHtml(
  state: 'success' | 'error',
  email: string,
  error?: string
): string {
  const safeEmail = email
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const title =
    state === 'success' ? 'Unsubscribed' : 'Unsubscribe failed';
  const body =
    state === 'success'
      ? `<p>You've been unsubscribed.</p><p>Sorry to see you go — feel free to <a href="/">come back</a> anytime.</p>`
      : `<p>${error ?? 'Something went wrong.'}</p><p><a href="/">Back to site</a></p>`;
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { font: 15px/1.6 -apple-system, system-ui, sans-serif; max-width: 480px; margin: 4rem auto; padding: 0 1.5rem; color: #1a1a1a; }
  h1 { font-size: 22px; margin: 0 0 .8rem; }
  small { color: #888; }
  a { color: #2563eb; }
</style></head>
<body>
  <h1>${title}</h1>
  ${body}
  <p><small>${safeEmail}</small></p>
</body></html>`;
}
