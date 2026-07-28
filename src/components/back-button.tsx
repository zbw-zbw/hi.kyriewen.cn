'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useClientValue } from '@/lib/use-client-state';

interface BackButtonProps {
  label: string;
  className?: string;
}

/**
 * 客户端返回按钮：点击返回上一页（浏览器历史）。
 * 如果没有上一页历史（直接打开链接），则回退到首页。
 */
export function BackButton({ label, className }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={
        className ??
        'inline-flex cursor-pointer items-center gap-1.5 py-2 text-sm text-[var(--muted)] hover:text-[var(--fg)]'
      }
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

interface SmartBackButtonProps {
  label: string;
  /** 从首页进入时返回的路径 */
  homeHref: string;
  /** 从列表页进入时返回的路径 */
  listHref: string;
  /** 列表页路径的匹配关键词（用于判断 referrer） */
  listPathMatch: string;
  className?: string;
}

/**
 * 根据 document.referrer 判定返回目标。纯函数，仅客户端可调用。
 * 同一次导航内 referrer 不会变，因此返回值稳定，适合做 useClientValue 的快照。
 */
function resolveBackHref(homeHref: string, listHref: string): string {
  const referrer = document.referrer;
  if (!referrer) return listHref;
  try {
    const referrerUrl = new URL(referrer);
    if (referrerUrl.host !== window.location.host) return listHref;
    // 去掉 locale 前缀后判断是否是首页
    const referrerPath = referrerUrl.pathname.replace(/^\/(en|zh)/, '') || '/';
    return referrerPath === '/' ? homeHref : listHref;
  } catch {
    return listHref;
  }
}

/**
 * 智能返回按钮：根据来源页决定返回目标。
 * - 如果从首页进入 → 返回首页
 * - 其他所有情况（列表页、外部链接、直接访问等）→ 返回对应列表页
 */
export function SmartBackButton({ label, homeHref, listHref, className }: SmartBackButtonProps) {
  const router = useRouter();
  // SSR 阶段读不到 referrer，先用列表页当回退
  const targetHref = useClientValue(() => resolveBackHref(homeHref, listHref), listHref);

  return (
    <button
      type="button"
      onClick={() => router.push(targetHref)}
      className={
        className ??
        'inline-flex cursor-pointer items-center gap-1.5 py-2 text-sm text-[var(--muted)] hover:text-[var(--fg)]'
      }
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
