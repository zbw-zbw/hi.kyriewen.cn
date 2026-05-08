import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeading({
  title,
  subtitle,
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-wrap items-end justify-between gap-3',
        className
      )}
    >
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-[var(--muted)]">{subtitle}</p>
        )}
      </div>
      {action && <div className="text-sm">{action}</div>}
    </div>
  );
}
