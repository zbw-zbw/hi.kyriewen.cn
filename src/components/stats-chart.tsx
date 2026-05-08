'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface StatsChartProps {
  data: Array<{ date: string; value: number }>;
  label: string;
  emptyHint?: string;
}

export function StatsChart({ data, label, emptyHint }: StatsChartProps) {
  // recharts 对单点 / 空数组渲染会很丑（就一个点或一条直线），
  // 统一降级为占位卡片，给明确的"数据累积中"文案。
  if (data.length < 2) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)] text-sm text-[var(--muted)]">
        {emptyHint ?? 'Not enough data yet.'}
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="var(--muted)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => v.slice(5)}
            minTickGap={24}
          />
          <YAxis
            stroke="var(--muted)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={40}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--muted)' }}
          />
          <Line
            type="monotone"
            dataKey="value"
            name={label}
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
