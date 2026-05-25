import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartContainer } from '../shared/ChartContainer'
import { COMMITS_COLOR } from '../../utils/colors'
import { formatNumber, tooltipFormatter } from '../../utils/formatters'

interface RepoTotal {
  name: string
  commits: number
  churn: number
  additions: number
  deletions: number
}

interface Props {
  data: RepoTotal[]
}

export function RepoComparison({ data }: Props) {
  const top10 = data.slice(0, 10)

  return (
    <ChartContainer title="Top Repos by Commits" isEmpty={top10.length === 0}>
      <ResponsiveContainer width="100%" height={Math.max(280, top10.length * 36)}>
        <BarChart data={top10} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
          <XAxis type="number" tickFormatter={(v: number) => formatNumber(v)} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
          <Tooltip formatter={tooltipFormatter} />
          <Bar dataKey="commits" fill={COMMITS_COLOR} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
