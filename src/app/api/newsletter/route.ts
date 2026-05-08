import { NextResponse } from 'next/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const apiKey = process.env.BUTTONDOWN_API_KEY;
    if (!apiKey) {
      // 本地 / 未配置 Buttondown 时返回“假成功”避免阻塞开发
      console.warn('[newsletter] BUTTONDOWN_API_KEY missing — accepting email but not persisting');
      return NextResponse.json({ ok: true, persisted: false });
    }

    const res = await fetch('https://api.buttondown.email/v1/subscribers', {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email_address: email }),
    });

    if (!res.ok && res.status !== 400) {
      // 400 通常是"已订阅"，幂等处理
      const text = await res.text();
      console.error('[newsletter] buttondown error', res.status, text);
      return NextResponse.json(
        { error: 'Subscription failed' },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[newsletter] unexpected error', err);
    return NextResponse.json(
      { error: 'Unexpected error' },
      { status: 500 }
    );
  }
}
