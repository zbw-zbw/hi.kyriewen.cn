import { createHash, timingSafeEqual } from 'node:crypto';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron-auth');

/**
 * CRON_SECRET 校验（cron 任务与按需缓存失效共用）。
 *
 * 设计要点：
 * 1. **fail-closed** —— 未配置 CRON_SECRET 时拒绝请求。
 *    原先的 `if (!secret) return true` 意味着一次环境变量误删就能把
 *    这些写库端点变成公开接口，且没有任何信号。
 * 2. **定时安全比较** —— 先摘要再比较，长度固定，不泄露前缀匹配长度。
 */

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

/** 常量时间的字符串相等判断。 */
export function secretEquals(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

/**
 * 校验 `Authorization: Bearer <CRON_SECRET>`。
 * Vercel Cron 会自动带上这个头。
 */
export function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    log.error('cron_secret_missing');
    return false;
  }
  const header = req.headers.get('authorization');
  if (!header) return false;
  return secretEquals(header, `Bearer ${secret}`);
}
