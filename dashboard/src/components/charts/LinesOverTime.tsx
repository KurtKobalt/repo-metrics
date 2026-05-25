import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartContainer } from '../shared/ChartContainer'
import type { WeeklyEntry } from '../../types/metrics'
import { ADDITIONS_COLOR, DELETIONS_COLOR, NET_COLOR } from '../../utils/colors'
import { formatNumber, formatWeekLabel, tooltipFormatter, tooltipLabelFormatter } from '../../utils/formatters'

interface Props {
  data: WeeklyEntry[]
}

export function LinesOverTime({ data }: Props) {
  const chartData = data.map(w => ({
    ...w,
    net: w.additions - w.deletions,
  }))

  return (
    <ChartContainer title="Lines of Code Over Time" isEmpty={data.length === 0}>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
          <XAxis dataKey="week_start" tickFormatter={formatWeekLabel} tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v: number) => formatNumber(v)} tick={{ fontSize: 11 }} />
          <Tooltip formatter={tooltipFormatter} labelFormatter={tooltipLabelFormatter} />
          <Area type="monotone" dataKey="additions" stackId="1" fill={ADDITIONS_COLOR} stroke={ADDITIONS_COLOR} fillOpacity={0.3} />
          <Area type="monotone" dataKey="deletions" stackId="2" fill={DELETIONS_COLOR} stroke={DELETIONS_COLOR} fillOpacity={0.3} />
          <Line type="monotone" dataKey="net" stroke={NET_COLOR} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
