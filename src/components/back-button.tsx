'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

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
 * 智能返回按钮：根据来源页决定返回目标。
 * - 如果从首页进入 → 返回首页
 * - 其他所有情况（列表页、外部链接、直接访问等）→ 返回对应列表页
 */
export function SmartBackButton({
  label,
  homeHref,
  listHref,
  listPathMatch,
  className,
}: SmartBackButtonProps) {
  const router = useRouter();
  const [targetHref, setTargetHref] = useState(listHref);

  useEffect(() => {
    const referrer = document.referrer;
    if (!referrer) {
      setTargetHref(listHref);
      return;
    }
    try {
      const referrerUrl = new URL(referrer);
      const currentHost = window.location.host;
      if (referrerUrl.host !== currentHost) {
        setTargetHref(listHref);
        return;
      }
      // 去掉 locale 前缀后判断是否是首页
      const referrerPath = referrerUrl.pathname.replace(/^\/(en|zh)/, '') || '/';
      const isFromHome = referrerPath === '/';
      if (isFromHome) {
        setTargetHref(homeHref);
      } else {
        // 从列表页或其他页面进入，统一返回列表页
        setTargetHref(listHref);
      }
    } catch {
      setTargetHref(listHref);
    }
  }, [homeHref, listHref, listPathMatch]);

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
