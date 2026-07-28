import { Redis } from '@upstash/redis';

/**
 * 共享的 Upstash Redis 客户端。
 *
 * 限流（ratelimit.ts）与每日成本护栏（cost-guard.ts）都需要它，
 * 各自 new 一个会重复建连接，因此抽到这里单例复用。
 *
 * 未配置时返回 null，由调用方决定降级策略 —— 不在这里抛错：
 * 缓存不可用不应让整站不可用。
 */

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (client) return client;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  client = new Redis({ url, token });
  return client;
}

/** 仅供测试使用：清掉单例，让后续调用重新读环境变量。 */
export function resetRedisForTests(): void {
  client = null;
}
