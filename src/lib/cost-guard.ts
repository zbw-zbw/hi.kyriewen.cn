import { getRedis } from '@/lib/redis';
import { createLogger } from '@/lib/logger';

/**
 * 每日成本预算护栏。
 *
 * 与限流（ratelimit.ts）的区别：
 * - 限流按 IP / 用户计，防的是**单点滥用**
 * - 护栏按全站每日总量计，防的是「分布多个 IP 的小流量把账单刷高」
 *   以及「代码 bug 导致的循环调用」—— 这两种情况限流都拦不住
 *
 * 触顶时会打一条 error 级日志（event: 'budget_exceeded'），
 * 这是唯一需要你在 Vercel 上配告警的事件。
 */

const log = createLogger('cost-guard');

export type CostBudget = 'ai-chat' | 'newsletter-welcome';

/**
 * 每日调用上限。按「正常使用远远够、异常用量立刻触顶」来定，
 * 宁可偶尔挡住真实用户，也不要收到意外账单。
 */
const DAILY_LIMIT: Record<CostBudget, number> = {
  // AI 对话：个人站点日常访问量远低于此
  'ai-chat': 300,
  // 订阅欢迎邮件：Resend 免费额度 3000 封/月，按日折算留足余量
  'newsletter-welcome': 80,
};

/** 预算键按 UTC 日切分，避免时区导致的重置歧义。 */
function todayKey(budget: CostBudget): string {
  const day = new Date().toISOString().slice(0, 10);
  return `kw:budget:${budget}:${day}`;
}

export interface BudgetResult {
  allowed: boolean;
  used: number;
  limit: number;
  /** true 表示 Redis 不可用、未真正计数（放行但无保护） */
  degraded: boolean;
}

/**
 * 记一次消耗并返回是否放行。
 *
 * 未配置 Upstash 时**放行**并打 error 日志：护栏依赖外部存储，
 * 若在此 fail-closed，一次 Redis 故障就会让 AI 与订阅功能整体不可用。
 * 这是有意的取舍 —— 代价是护栏失效期间没有保护，所以日志必须够响。
 */
export async function consumeDailyBudget(budget: CostBudget): Promise<BudgetResult> {
  const limit = DAILY_LIMIT[budget];
  const redis = getRedis();

  if (!redis) {
    log.error('budget_unprotected', undefined, {
      budget,
      reason: 'upstash_not_configured',
    });
    return { allowed: true, used: 0, limit, degraded: true };
  }

  try {
    const key = todayKey(budget);
    const used = await redis.incr(key);
    // 首次写入时设过期，48h 足够覆盖跨日与时钟偏差
    if (used === 1) await redis.expire(key, 60 * 60 * 48);

    if (used > limit) {
      // 需要配告警的事件：正常流量不会触发
      log.error('budget_exceeded', undefined, { budget, used, limit });
      return { allowed: false, used, limit, degraded: false };
    }

    // 到 80% 时预警，留出处置时间
    if (used === Math.floor(limit * 0.8)) {
      log.warn('budget_near_limit', { budget, used, limit });
    }

    return { allowed: true, used, limit, degraded: false };
  } catch (error) {
    log.error('budget_check_failed', error, { budget });
    return { allowed: true, used: 0, limit, degraded: true };
  }
}
