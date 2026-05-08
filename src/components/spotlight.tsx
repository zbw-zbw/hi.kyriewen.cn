'use client';

import { useEffect, useRef } from 'react';

/**
 * 鼠标光晕（brittanychiang 同款）。
 * 监听 mousemove，将坐标写入 CSS 变量 --mouse-x / --mouse-y，
 * 由 globals.css 中 .spotlight 径向渐变呈现。
 */
export function Spotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(hover: none)').matches) return; // 触屏跳过

    const handler = (event: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      el.style.setProperty('--mouse-x', `${event.clientX}px`);
      el.style.setProperty('--mouse-y', `${event.clientY}px`);
    };

    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="spotlight fixed inset-0 z-0 h-screen w-screen"
    />
  );
}
