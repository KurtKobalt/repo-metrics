import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartContainer } from '../shared/ChartContainer'
import { STATIC_COLORS } from '../../utils/colors'
import { formatNumber, tooltipFormatter } from '../../utils/formatters'
import type { Contributor } from '../../types/metrics'

interface Props {
  data: Contributor[]
}

export function ContributorChart({ data }: Props) {
  const top10 = data.slice(0, 10)

  return (
    <ChartContainer title="Top Contributors" isEmpty={top10.length === 0}>
      <ResponsiveContainer width="100%" height={Math.max(280, top10.length * 36)}>
        <BarChart data={top10} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
          <XAxis type="number" tickFormatter={(v: number) => formatNumber(v)} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="login" tick={{ fontSize: 11 }} width={120} />
          <Tooltip formatter={tooltipFormatter} />
          <Bar dataKey="commits" fill={STATIC_COLORS[4]} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
