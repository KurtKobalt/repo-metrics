import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { WeeklyMetrics } from '../../types/metrics'
import { formatCompact, formatNumber, formatWeekLabel } from '../../utils/formatters'
import { ChartContainer } from '../shared/ChartContainer'

const tooltipStyle = { background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }

export function CommitVelocity({ data }: { data: WeeklyMetrics[] }) {
  return (
    <ChartContainer
      eyebrow="VELOCITY"
      title="Commit rhythm"
      description="Weekly commit volume across the selected scope."
      isEmpty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height={330}>
        <AreaChart data={data} margin={{ top: 18, right: 8, left: -26, bottom: 0 }}>
          <defs>
            <linearGradient id="commitArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.38} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="week_start" tickFormatter={formatWeekLabel} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={value => formatWeekLabel(String(value))}
            formatter={value => [formatNumber(Number(value ?? 0)), 'Commits']}
          />
          <Area type="monotone" dataKey="commits" stroke="var(--accent)" strokeWidth={2.5} fill="url(#commitArea)" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
