import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { WeeklyMetrics } from '../../types/metrics'
import { formatCompact, formatNumber, formatWeekLabel } from '../../utils/formatters'
import { ChartContainer } from '../shared/ChartContainer'

const tooltipStyle = { background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }

export function LineImpactChart({ data, note }: { data: WeeklyMetrics[]; note: string }) {
  const legend = (
    <div className="chart-legend">
      <span><i className="legend-added" />Added</span>
      <span><i className="legend-updated" />Updated*</span>
      <span><i className="legend-deleted" />Deleted</span>
    </div>
  )
  return (
    <ChartContainer
      eyebrow="CODE IMPACT"
      title="Lines modified by week"
      description="Mutually exclusive added, estimated updated, and deleted lines."
      action={legend}
      isEmpty={data.length === 0}
      className="impact-panel"
    >
      <ResponsiveContainer width="100%" height={330}>
        <BarChart data={data} margin={{ top: 18, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="week_start" tickFormatter={formatWeekLabel} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} minTickGap={28} />
          <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={value => formatWeekLabel(String(value))}
            formatter={(value, name) => [formatNumber(Number(value ?? 0)), String(name).replace('_', ' ')]}
          />
          <Bar dataKey="lines_added" name="Added" stackId="impact" fill="var(--added)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="updated_lines" name="Updated" stackId="impact" fill="var(--updated)" />
          <Bar dataKey="lines_deleted" name="Deleted" stackId="impact" fill="var(--deleted)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <p className="chart-footnote">* {note}</p>
    </ChartContainer>
  )
}
