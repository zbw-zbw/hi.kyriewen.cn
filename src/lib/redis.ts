import { Redis } from '@upstash/redis';
import { createLogger } from '@/lib/logger';

/**
 * 共享的 Upstash Redis 客户端。
 *
 * 限流（ratelimit.ts）与每日成本护栏（cost-guard.ts）都需要它，
 * 各自 new 一个会重复建连接，因此抽到这里单例复用。
 *
 * 未配置时返回 null，由调用方降级放行 —— 不在这里抛错：
 * 缓存不可用不应让整站不可用。
 *
 * 但**必须发出声音**：限流与成本护栏都依赖它，静默 null 意味着
 * 两道防护同时失效而无人知晓。生产环境实际发生过这种情况：
 * .env.production 里有值（本地文件），Vercel 面板上却没配，
 * 于是线上限流长期形同虚设，直到手工连发探测才发现。
 */

const log = createLogger('redis');

let client: Redis | null = null;
/** 未配置告警只打一次，避免每个请求都刷日志 */
let missingConfigReported = false;

export function getRedis(): Redis | null {
  if (client) return client;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (!missingConfigReported) {
      missingConfigReported = true;
      // error 级：这不是"可选功能未启用"，而是两道防护同时失效
      log.error('upstash_not_configured', undefined, {
        impact: 'rate_limiting_and_cost_guard_disabled',
        missing: [!url && 'UPSTASH_REDIS_REST_URL', !token && 'UPSTASH_REDIS_REST_TOKEN'].filter(
          Boolean,
        ),
      });
    }
    return null;
  }

  client = new Redis({ url, token });
  return client;
}

/** 仅供测试使用：清掉单例与告警标记，让后续调用重新读环境变量。 */
export function resetRedisForTests(): void {
  client = null;
  missingConfigReported = false;
}

/** 保活标记键。在 Upstash Data Browser 里可直接看到上次保活时间。 */
const KEEPALIVE_KEY = 'kw:keepalive';

/**
 * 每日保活：防止 Upstash 免费库因闲置被自动删除。
 *
 * 背景（真实发生过）：Upstash 对免费库「14 天无活动即删除」。
 * 这构成一个恶性循环：限流一旦 fail-open，Redis 就没了流量
 * → 被判定为闲置 → 删库 → 限流永久 fail-open。上一次就是这么坏的。
 *
 * 由每日 cron 调用，把「Redis 保持存活」与「限流是否正常工作」解耦：
 * 即使限流又坏了，库也不会被删，日志还能继续报告真正的问题。
 *
 * 永不抛错：保活失败不应影响它所依附的 cron 任务。
 */
export async function keepAliveRedis(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false; // getRedis 已记录 upstash_not_configured

  try {
    // 写入时间戳而不是计数：既算活动，又能当作「上次保活于何时」的诊断信息
    await redis.set(KEEPALIVE_KEY, new Date().toISOString());
    return true;
  } catch (error) {
    log.error('keepalive_failed', error, {
      impact: 'upstash_may_be_deleted_after_14d_inactivity',
    });
    return false;
  }
}
