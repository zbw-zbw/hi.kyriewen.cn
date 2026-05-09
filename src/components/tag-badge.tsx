import { cn } from '@/lib/utils';

/**
 * 根据标签名确定性地选择一个颜色方案。
 * 使用简单 hash，同一个 tag 始终同色。
 */
const TAG_COLORS = [
  { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20', darkText: 'dark:text-blue-400' },
  { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20', darkText: 'dark:text-emerald-400' },
  { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/20', darkText: 'dark:text-purple-400' },
  { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20', darkText: 'dark:text-amber-400' },
  { bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'border-rose-500/20', darkText: 'dark:text-rose-400' },
  { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/20', darkText: 'dark:text-cyan-400' },
  { bg: 'bg-pink-500/10', text: 'text-pink-600', border: 'border-pink-500/20', darkText: 'dark:text-pink-400' },
  { bg: 'bg-indigo-500/10', text: 'text-indigo-600', border: 'border-indigo-500/20', darkText: 'dark:text-indigo-400' },
] as const;

function hashTag(tag: string): number {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getTagColor(tag: string) {
  return TAG_COLORS[hashTag(tag) % TAG_COLORS.length]!;
}

interface TagBadgeProps {
  tag: string;
  /** 是否处于选中/激活状态 */
  active?: boolean;
  /** 点击回调（用于筛选场景） */
  onClick?: (tag: string) => void;
  className?: string;
}

export function TagBadge({ tag, active, onClick, className }: TagBadgeProps) {
  const color = getTagColor(tag);
  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      {...(onClick ? { type: 'button' as const, onClick: () => onClick(tag) } : {})}
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-all',
        color.bg,
        color.text,
        color.darkText,
        color.border,
        active && 'ring-1 ring-current shadow-sm',
        onClick && 'cursor-pointer hover:shadow-sm hover:ring-1 hover:ring-current',
        className
      )}
    >
      #{tag}
    </Component>
  );
}
