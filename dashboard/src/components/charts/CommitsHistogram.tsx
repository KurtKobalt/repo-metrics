import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush } from 'recharts'
import { ChartContainer } from '../shared/ChartContainer'
import type { WeeklyEntry } from '../../types/metrics'
import { COMMITS_COLOR, ADDITIONS_COLOR, DELETIONS_COLOR } from '../../utils/colors'
import { formatNumber, formatWeekLabel, tooltipFormatter, tooltipLabelFormatter } from '../../utils/formatters'

interface Props {
  data: WeeklyEntry[]
}

export function CommitsHistogram({ data }: Props) {
  const [layers, setLayers] = useState({ commits: true, additions: false, deletions: false })

  function toggle(key: keyof typeof layers) {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <ChartContainer title="Commits & Code Changes" isEmpty={data.length === 0}>
      <div className="flex gap-4 mb-3">
        {([['commits', 'Commits', COMMITS_COLOR], ['additions', 'Additions', ADDITIONS_COLOR], ['deletions', 'Deletions', DELETIONS_COLOR]] as const).map(([key, label, color]) => (
          <label key={key} className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="checkbox" checked={layers[key]} onChange={() => toggle(key)} className="rounded" />
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
            {label}
          </label>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
          <XAxis dataKey="week_start" tickFormatter={formatWeekLabel} tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v: number) => formatNumber(v)} tick={{ fontSize: 11 }} />
          <Tooltip formatter={tooltipFormatter} labelFormatter={tooltipLabelFormatter} />
          {layers.commits && <Bar dataKey="commits" fill={COMMITS_COLOR} opacity={0.8} />}
          {layers.additions && <Bar dataKey="additions" fill={ADDITIONS_COLOR} opacity={0.8} />}
          {layers.deletions && <Bar dataKey="deletions" fill={DELETIONS_COLOR} opacity={0.8} />}
          <Brush dataKey="week_start" height={25} stroke="#8884d8" tickFormatter={formatWeekLabel} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
