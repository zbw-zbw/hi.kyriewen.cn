import { NextResponse } from 'next/server';

/**
 * Newsletter 订阅 API：
 *
 * 1. 邮箱写入 Resend Audience（免费额度：3k 订阅者、3k 封/月）
 * 2. 如果配了 RESEND_AUDIENCE_ID + FROM_EMAIL，再发一封 double opt-in 的欢迎邮件
 * 3. 重复订阅幂等处理（Resend 会返回 already_exists）
 *
 * 环境变量：
 *   - RESEND_API_KEY（必填，才会真正持久化）
 *   - RESEND_AUDIENCE_ID（必填，指向某个 Audience，Resend Dashboard → Audiences 创建后复制 ID）
 *   - NEWSLETTER_FROM_EMAIL（可选，如 "Kyriewen <support@kyriewen.cn>"；未配置时只订阅、不发欢迎邮件）
 *   - NEXT_PUBLIC_SITE_URL（欢迎邮件里 CTA 用）
 *
 * 未配置 RESEND_API_KEY 时返回 `{ ok: true, persisted: false }`，
 * 本地 dev 友好，前端照常 toast 成功。
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ResendErrorBody {
  name?: string;
  message?: string;
  statusCode?: number;
}

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const audienceId = process.env.RESEND_AUDIENCE_ID;

    if (!apiKey || !audienceId) {
      // 本地 / 未配置 Resend 时返回“假成功”避免阻塞开发
      console.warn(
        '[newsletter] RESEND_API_KEY or RESEND_AUDIENCE_ID missing — accepting email but not persisting',
      );
      return NextResponse.json({ ok: true, persisted: false });
    }

    // 1. 订阅到 Audience（Resend Contacts API）
    const subscribeRes = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        unsubscribed: false,
      }),
    });

    if (!subscribeRes.ok) {
      const body = (await subscribeRes.json().catch(() => ({}))) as ResendErrorBody;
      // Resend 对重复订阅通常返回 "contact_already_exists"，幂等处理
      const isDuplicate =
        body.name === 'contact_already_exists' ||
        body.message?.toLowerCase().includes('already exists');
      if (!isDuplicate) {
        console.error(
          '[newsletter] resend subscribe error',
          subscribeRes.status,
          JSON.stringify(body),
        );
        return NextResponse.json(
          { error: 'Subscription failed. Please try again later.' },
          { status: 502 },
        );
      }
    }

    // 2. 发欢迎邮件（可选，未配 FROM_EMAIL 就跳过）
    const fromEmail = process.env.NEWSLETTER_FROM_EMAIL;
    if (fromEmail) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hi.kyriewen.cn';
      const mailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject: 'Welcome to Kyriewen’s Newsletter 👋',
          html: buildWelcomeHtml(siteUrl),
        }),
      });

      if (!mailRes.ok) {
        // 欢迎邮件失败不影响订阅成功（邮箱已入库）
        const text = await mailRes.text().catch(() => '');
        console.warn('[newsletter] resend send welcome failed', mailRes.status, text);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[newsletter] unexpected error', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

function buildWelcomeHtml(siteUrl: string) {
  return `
  <!doctype html>
  <html>
    <body style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #111; line-height: 1.6;">
      <h1 style="font-size: 22px; margin: 0 0 16px;">Hi there 👋</h1>
      <p>Thanks for subscribing to <strong>Kyriewen’s Newsletter</strong>.</p>
      <p>You'll get occasional updates on new products, essays and indie-hacking notes — probably once a month, never spam.</p>
      <p>In the meantime, feel free to browse:</p>
      <ul>
        <li><a href="${siteUrl}/projects" style="color: #4285f4;">Projects</a> — the small tools I'm building</li>
        <li><a href="${siteUrl}/blog" style="color: #4285f4;">Writing</a> — notes on code & craft</li>
        <li><a href="${siteUrl}/now" style="color: #4285f4;">Now</a> — what I'm focused on right now</li>
      </ul>
      <p style="margin-top: 32px; color: #888; font-size: 13px;">— Kyriewen</p>
    </body>
  </html>
  `.trim();
}
