'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ScrollRevealProps {
  /** 入场延迟，秒。用于 stagger 多个元素。 */
  delay?: number;
  /** 入场动效幅度。 */
  variant?: 'fade' | 'fadeUp' | 'fadeIn';
  /** 视口触发阈值，默认 0.15。 */
  amount?: number;
  /** 是否只触发一次。 */
  once?: boolean;
  as?: 'div' | 'section' | 'article' | 'li';
  className?: string;
  children: React.ReactNode;
}

/**
 * 全站统一的 scroll-triggered 入场动效。
 *
 * 设计原则：
 *  - 默认 fade + 8px translateY（Brittany / Linear / OpenAI 通用手法）
 *  - 自动尊重用户的 prefers-reduced-motion
 *  - 时长 700ms + ease-out-expo，不刷存在感
 *
 * 用法：
 *   <ScrollReveal>
 *     <SectionHeading index="01" title="Selected Work" />
 *   </ScrollReveal>
 */
export function ScrollReveal({
  delay = 0,
  variant = 'fadeUp',
  amount = 0.05,
  once = true,
  as = 'div',
  className,
  children,
}: ScrollRevealProps) {
  const reduceMotion = useReducedMotion();

  const variants = {
    fade: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
    fadeUp: {
      hidden: { opacity: 0, y: 12 },
      visible: { opacity: 1, y: 0 },
    },
    fadeIn: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  } as const;

  const MotionTag = motion[as];

  if (reduceMotion) {
    const Tag = as;
    return <Tag className={cn(className)}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      transition={{
        duration: 0.45,
        delay: delay * 0.6,
        ease: [0.19, 1, 0.22, 1], // ease-out-expo
      }}
      variants={variants[variant]}
    >
      {children}
    </MotionTag>
  );
}
