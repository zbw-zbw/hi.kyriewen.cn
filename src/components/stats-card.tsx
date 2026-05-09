import { Card, CardHeader, CardContent } from '@/components/ui/card';
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
    <Card
      className={cn(
        'shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-elevated)]',
        className
      )}
    >
      <CardHeader className="gap-2 p-5 pb-2">
        <p
          className="truncate font-mono text-[var(--text-eyebrow)] tracking-wider text-[var(--muted)]"
          title={label}
        >
          {label}
        </p>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <p className="min-h-[2.25rem] text-2xl font-bold tabular-nums sm:min-h-[2.5rem] sm:text-3xl">
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
      </CardContent>
    </Card>
  );
}
