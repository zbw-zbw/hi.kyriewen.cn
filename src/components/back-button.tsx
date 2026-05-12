'use client';

import { useRouter } from 'next/navigation';
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
