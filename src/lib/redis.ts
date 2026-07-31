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
