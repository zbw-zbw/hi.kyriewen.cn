import { cn } from '@/lib/utils';

interface StatsCardProps {
  label: string;
  value: string | number;
  hint?: string;
  trend?: number; // +/- 变化
  className?: string;
}

export function StatsCard({
  label,
  value,
  hint,
  trend,
  className,
}: StatsCardProps) {
  const trendSign = trend === undefined ? '' : trend > 0 ? '+' : '';
  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--border)] bg-[var(--card)] p-5',
        className
      )}
    >
      <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)]">
        {hint && <span>{hint}</span>}
        {trend !== undefined && trend !== 0 && (
          <span
            className={cn(
              'font-mono',
              trend > 0 ? 'text-emerald-500' : 'text-rose-500'
            )}
          >
            {trendSign}
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
