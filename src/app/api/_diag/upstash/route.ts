import { getRedis } from '@/lib/redis';

/**
 * 临时诊断端点 —— 用完即删。
 *
 * 目的：确认线上运行时到底能否看到 Upstash 配置、以及连接是否真的可用。
 * 生产实测发现限流未生效（并发 25 次、配额 10，零个 429），
 * 但 Vercel 面板上确认已配变量，需要区分三种可能：
 *   1. 运行时读不到环境变量（Edge Runtime 注入 / 环境勾选问题）
 *   2. 能读到但连接失败（凭据无效、区域限制）
 *   3. 能读到也能连，是限流逻辑本身的问题
 *
 * 只输出布尔值、长度与主机名，绝不输出 token 本身。
 */

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 简单守卫：必须带 CRON_SECRET，避免把诊断信息暴露给任何人
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  const env = {
    urlPresent: Boolean(url),
    urlLength: url?.length ?? 0,
    // 只暴露主机名，用于确认指向的是哪个实例
    urlHost: url ? new URL(url).host : null,
    tokenPresent: Boolean(token),
    tokenLength: token?.length ?? 0,
  };

  const client = getRedis();
  if (!client) {
    return Response.json({ env, clientCreated: false, ping: null });
  }

  // 实际打一次 Redis，确认连接与凭据是否有效
  let ping: { ok: boolean; value?: unknown; error?: string };
  try {
    const value = await client.incr('kw:diag:ping');
    ping = { ok: true, value };
  } catch (error) {
    ping = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  return Response.json({ env, clientCreated: true, ping });
}
