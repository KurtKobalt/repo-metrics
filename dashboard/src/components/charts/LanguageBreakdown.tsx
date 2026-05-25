import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChartContainer } from '../shared/ChartContainer'
import { STATIC_COLORS } from '../../utils/colors'
import { tooltipBytesFormatter } from '../../utils/formatters'

interface Props {
  data: Record<string, number>
}

export function LanguageBreakdown({ data }: Props) {
  const entries = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }))

  const total = entries.reduce((s, e) => s + e.value, 0)

  return (
    <ChartContainer title="Languages" isEmpty={entries.length === 0}>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={entries}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            dataKey="value"
            nameKey="name"
            paddingAngle={2}
          >
            {entries.map((_, i) => (
              <Cell key={i} fill={STATIC_COLORS[i % STATIC_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={tooltipBytesFormatter} />
          <Legend
            formatter={(value: string) => {
              const entry = entries.find(e => e.name === value)
              const pct = entry ? ((entry.value / total) * 100).toFixed(1) : '0'
              return `${value} (${pct}%)`
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
