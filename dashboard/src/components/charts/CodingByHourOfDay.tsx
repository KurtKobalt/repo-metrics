import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartContainer } from '../shared/ChartContainer'
import { COMMITS_COLOR } from '../../utils/colors'
import { formatNumber, tooltipFormatter } from '../../utils/formatters'

interface Props {
  data: { hour: string; commits: number }[]
  weekCount: number
}

export function CodingByHourOfDay({ data, weekCount }: Props) {
  const [mode, setMode] = useState<'total' | 'avg'>('total')

  const chartData = useMemo(() => {
    if (mode === 'total' || weekCount === 0) return data
    return data.map(d => ({ ...d, commits: +(d.commits / weekCount).toFixed(1) }))
  }, [data, mode, weekCount])

  return (
    <ChartContainer title="Commits by Hour of Day" isEmpty={data.length === 0}>
      <div className="flex gap-1 mb-3">
        {(['total', 'avg'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${mode === m ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            {m === 'total' ? 'Total' : 'Avg / week'}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
          <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} />
          <YAxis tickFormatter={(v: number) => formatNumber(v)} tick={{ fontSize: 11 }} />
          <Tooltip formatter={tooltipFormatter} />
          <Bar dataKey="commits" fill={COMMITS_COLOR} radius={[4, 4, 0, 0]} opacity={0.7} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
