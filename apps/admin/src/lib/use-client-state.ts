'use client';

import { useSyncExternalStore } from 'react';

/**
 * 客户端状态读取工具（与主站 src/lib/use-client-state.ts 保持一致）。
 *
 * 用来替代 `useEffect(() => setState(...), [])` 这类「挂载后同步一次外部状态」的写法：
 * 那种写法会在 effect 里同步 setState，触发级联渲染，也被
 * eslint 规则 react-hooks/set-state-in-effect 禁止。
 */

/** 永不变化的外部源：这里只借用 useSyncExternalStore 的双快照能力 */
const neverChanges = () => () => {};

const getTrue = () => true;
const getFalse = () => false;

/** SSR 与首次 hydration 渲染返回 false，hydration 完成后返回 true。 */
export function useHydrated(): boolean {
  return useSyncExternalStore(neverChanges, getTrue, getFalse);
}

/**
 * 读取只在客户端存在的环境值（navigator / document / localStorage 等）。
 *
 * @param read 纯读取函数。**必须对同一环境返回相等的值**（原始类型），
 *   否则每次渲染拿到新引用会导致无限重渲染。
 * @param serverValue SSR 阶段使用的回退值。
 */
export function useClientValue<T extends string | number | boolean>(
  read: () => T,
  serverValue: T,
): T {
  return useSyncExternalStore(neverChanges, read, () => serverValue);
}
