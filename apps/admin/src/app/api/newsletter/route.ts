import { NextResponse } from 'next/server';
import { db } from '@repo/db';
import { newsletterIssues } from '@repo/db/schema';
import { desc } from 'drizzle-orm';
import { triggerRevalidation } from '@/lib/revalidate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/newsletter — 获取已发送的期刊列表
 */
export async function GET() {
  try {
    const issues = await db.select().from(newsletterIssues).orderBy(desc(newsletterIssues.sentAt));
    return NextResponse.json(issues);
  } catch (err) {
    console.error('[newsletter] list error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * POST /api/newsletter — 发送 Newsletter 并记录
 *
 * Body: { subject, previewText?, htmlContent }
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      subject: string;
      previewText?: string;
      htmlContent: string;
    };

    if (!body.subject || !body.htmlContent) {
      return NextResponse.json({ error: 'subject and htmlContent are required' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    const fromEmail = process.env.NEWSLETTER_FROM_EMAIL ?? 'Kyriewen <support@kyriewen.cn>';

    if (!apiKey || !audienceId) {
      // Save as draft without sending
      const [inserted] = await db
        .insert(newsletterIssues)
        .values({
          subject: body.subject,
          previewText: body.previewText ?? null,
          htmlContent: body.htmlContent,
          recipientCount: 0,
        })
        .returning();

      return NextResponse.json({
        ok: true,
        sent: false,
        reason: 'RESEND_API_KEY or RESEND_AUDIENCE_ID not configured',
        issue: inserted,
      });
    }

    // 1. Send via Resend Broadcast API
    const broadcastRes = await fetch('https://api.resend.com/broadcasts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audience_id: audienceId,
        from: fromEmail,
        subject: body.subject,
        html: body.htmlContent,
        preview_text: body.previewText ?? undefined,
      }),
    });

    let broadcastId: string | null = null;
    let recipientCount = 0;

    if (broadcastRes.ok) {
      const broadcastData = (await broadcastRes.json()) as {
        id?: string;
      };
      broadcastId = broadcastData.id ?? null;

      // Try to get audience size for recipient count
      try {
        const audienceRes = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (audienceRes.ok) {
          const audienceData = (await audienceRes.json()) as {
            data: Array<{ id: string }>;
          };
          recipientCount = audienceData.data?.length ?? 0;
        }
      } catch {
        // ignore — we still save the issue
      }
    } else {
      const errorText = await broadcastRes.text().catch(() => '');
      console.error('[newsletter] Resend broadcast error', broadcastRes.status, errorText);
      return NextResponse.json(
        { error: 'Failed to send broadcast', resendStatus: broadcastRes.status },
        { status: 502 },
      );
    }

    // 2. Save to database
    const [inserted] = await db
      .insert(newsletterIssues)
      .values({
        subject: body.subject,
        previewText: body.previewText ?? null,
        htmlContent: body.htmlContent,
        sentAt: new Date(),
        recipientCount,
        resendBroadcastId: broadcastId,
      })
      .returning();

    // Trigger main site cache invalidation (non-blocking)
    triggerRevalidation(['/newsletter']).catch(() => {});

    return NextResponse.json({
      ok: true,
      sent: true,
      issue: inserted,
    });
  } catch (err) {
    console.error('[newsletter] send error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
