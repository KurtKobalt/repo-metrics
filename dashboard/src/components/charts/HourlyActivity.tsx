import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HourlyMetrics } from '../../types/metrics'
import { formatCompact, formatNumber } from '../../utils/formatters'
import { ChartContainer } from '../shared/ChartContainer'

const tooltipStyle = {
  background: 'var(--surface-raised)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  color: 'var(--text)',
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export function HourlyActivity({ data }: { data: HourlyMetrics[] }) {
  const peak = [...data].sort((left, right) => right.commits - left.commits)[0]
  const total = data.reduce((sum, item) => sum + item.commits, 0)
  const action = peak && peak.commits > 0 ? (
    <div className="hourly-peak">
      <span>Peak hour</span>
      <strong>{formatHour(peak.hour)}</strong>
      <small>{formatNumber(peak.commits)} commits</small>
    </div>
  ) : null

  return (
    <ChartContainer
      eyebrow="24-HOUR CADENCE"
      title="Contribution by hour"
      description="Commit volume by the local clock stored in each commit, inside the current filters."
      action={action}
      isEmpty={total === 0}
      className="hourly-panel"
    >
      <ResponsiveContainer width="100%" height={290}>
        <BarChart data={data} margin={{ top: 16, right: 8, left: -24, bottom: 0 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="hour"
            tickFormatter={hour => Number(hour) % 3 === 0 ? formatHour(Number(hour)) : ''}
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis tickFormatter={formatCompact} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={hour => `${formatHour(Number(hour))}–${formatHour(Number(hour) + 1)}`}
            formatter={(value, name) => [formatNumber(Number(value ?? 0)), String(name)]}
          />
          <Bar dataKey="commits" name="Commits" fill="var(--accent)" radius={[5, 5, 0, 0]} maxBarSize={34} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
