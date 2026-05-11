import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';
import { getI18nOverrides } from '@/lib/content-loader';

/**
 * 深度合并两个对象，source 会覆盖 target 中对应的值。
 * 仅合并普通对象，数组和原始值直接覆盖。
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = result[key];
    if (
      sv &&
      typeof sv === 'object' &&
      !Array.isArray(sv) &&
      tv &&
      typeof tv === 'object' &&
      !Array.isArray(tv)
    ) {
      result[key] = deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
    } else {
      result[key] = sv;
    }
  }
  return result;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  // 1. 加载本地 JSON 作为基础
  const localMessages = (await import(`../messages/${locale}.json`)).default as Record<
    string,
    unknown
  >;

  // 2. 从 DB 读取覆盖文案（失败时返回空对象，不影响渲染）
  let dbOverrides: Record<string, unknown> = {};
  try {
    dbOverrides = await getI18nOverrides(locale);
  } catch {
    // 静默降级：DB 不可用时使用纯本地文案
  }

  // 3. 深度合并：DB 覆盖本地
  const messages =
    Object.keys(dbOverrides).length > 0 ? deepMerge(localMessages, dbOverrides) : localMessages;

  return {
    locale,
    messages,
  };
});
