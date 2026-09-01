import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ActivityRow, DateRange, MetricsData } from '../../types/metrics'
import { addDays, parseISODate, startOfWeek, toISODate } from '../../utils/dateUtils'
import { formatCompact, formatNumber, formatWeekLabel } from '../../utils/formatters'
import { STATIC_COLORS } from '../../utils/colors'
import { ChartContainer } from '../shared/ChartContainer'

type Dimension = 'person' | 'repo'
type Metric = 'commits' | 'changed_lines'
type Mode = 'weekly' | 'cumulative'

interface Series {
  id: string
  name: string
  total: number
  color: string
}

interface Point {
  period: string
  [seriesId: string]: string | number
}

const METRICS: { key: Metric; label: string; noun: string }[] = [
  { key: 'commits', label: 'Commits', noun: 'commits' },
  { key: 'changed_lines', label: 'Lines', noun: 'changed lines' },
]

const MAX_SERIES = 10
const tooltipStyle = { background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }

function buildComparison(
  rows: ActivityRow[],
  data: MetricsData,
  dimension: Dimension,
  metric: Metric,
  mode: Mode,
  range: DateRange,
): { points: Point[]; series: Series[]; activeCount: number } {
  const totals = new Map<string, number>()
  for (const row of rows) {
    const id = dimension === 'person' ? row.person : row.repo
    totals.set(id, (totals.get(id) ?? 0) + row[metric])
  }

  const personNames = new Map(data.people.map(person => [person.id, person.name]))
  const colorOrder = dimension === 'person'
    ? data.people.map(person => person.id)
    : Object.keys(data.repos).sort()
  const ranked = [...totals.entries()]
    .filter(([, total]) => total > 0)
    .sort(([, left], [, right]) => right - left)
  const series: Series[] = ranked.slice(0, MAX_SERIES).map(([id, total]) => ({
    id,
    total,
    color: STATIC_COLORS[Math.max(0, colorOrder.indexOf(id)) % STATIC_COLORS.length],
    name: dimension === 'person' ? (personNames.get(id) ?? id) : (data.repos[id]?.display_name ?? id),
  }))
  const visibleIds = new Set(series.map(item => item.id))
  const values = new Map<string, number>()

  for (const row of rows) {
    const id = dimension === 'person' ? row.person : row.repo
    if (!visibleIds.has(id)) continue
    const week = toISODate(startOfWeek(parseISODate(row.date)))
    const key = `${week}\u0000${id}`
    values.set(key, (values.get(key) ?? 0) + row[metric])
  }

  const points: Point[] = []
  const running = new Map(series.map(item => [item.id, 0]))
  const lastWeek = startOfWeek(range.to)
  for (let cursor = startOfWeek(range.from); cursor <= lastWeek; cursor = addDays(cursor, 7)) {
    const period = toISODate(cursor)
    const point: Point = { period }
    for (const item of series) {
      const weeklyValue = values.get(`${period}\u0000${item.id}`) ?? 0
      const nextValue = mode === 'cumulative' ? (running.get(item.id) ?? 0) + weeklyValue : weeklyValue
      running.set(item.id, nextValue)
      point[item.id] = nextValue
    }
    points.push(point)
  }

  return { points, series, activeCount: ranked.length }
}

export function ComparisonChart({ rows, data, dateRange }: { rows: ActivityRow[]; data: MetricsData; dateRange: DateRange }) {
  const [dimension, setDimension] = useState<Dimension>('person')
  const [metric, setMetric] = useState<Metric>('commits')
  const [mode, setMode] = useState<Mode>('cumulative')
  const comparison = useMemo(
    () => buildComparison(rows, data, dimension, metric, mode, dateRange),
    [rows, data, dimension, metric, mode, dateRange],
  )
  const names = useMemo(() => new Map(comparison.series.map(item => [item.id, item.name])), [comparison.series])
  const selectedMetric = METRICS.find(item => item.key === metric) ?? METRICS[0]
  const subject = dimension === 'person' ? 'people' : 'repositories'

  const controls = (
    <div className="comparison-controls">
      <div className="metric-switcher" aria-label="Comparison group">
        <button type="button" className={dimension === 'person' ? 'active' : ''} onClick={() => setDimension('person')}>People</button>
        <button type="button" className={dimension === 'repo' ? 'active' : ''} onClick={() => setDimension('repo')}>Repositories</button>
      </div>
      <div className="metric-switcher" aria-label="Comparison metric">
        {METRICS.map(item => (
          <button type="button" key={item.key} className={metric === item.key ? 'active' : ''} onClick={() => setMetric(item.key)}>{item.label}</button>
        ))}
      </div>
      <div className="metric-switcher" aria-label="Comparison calculation">
        <button type="button" className={mode === 'weekly' ? 'active' : ''} onClick={() => setMode('weekly')}>Weekly</button>
        <button type="button" className={mode === 'cumulative' ? 'active' : ''} onClick={() => setMode('cumulative')}>Accumulated</button>
      </div>
    </div>
  )

  return (
    <ChartContainer
      eyebrow="COMPARISON"
      title={`${mode === 'cumulative' ? 'Accumulated' : 'Weekly'} output by ${dimension === 'person' ? 'person' : 'repository'}`}
      description={`Compare ${selectedMetric.noun} inside the exact team, repository, and time filters above.`}
      action={controls}
      isEmpty={comparison.series.length === 0}
      className="comparison-panel"
    >
      <div className="comparison-legend" aria-label={`Active ${subject}`}>
        {comparison.series.map(item => (
          <span key={item.id} title={`${item.name}: ${formatNumber(item.total)} ${selectedMetric.noun}`}>
            <i style={{ background: item.color }} />
            <b>{item.name}</b>
            <small>{formatCompact(item.total)}</small>
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={390}>
        <LineChart data={comparison.points} margin={{ top: 16, right: 14, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="period" tickFormatter={formatWeekLabel} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} minTickGap={30} />
          <YAxis tickFormatter={formatCompact} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={value => `Week of ${formatWeekLabel(String(value))}`}
            formatter={(value, name) => [formatNumber(Number(value ?? 0)), names.get(String(name)) ?? String(name)]}
          />
          {comparison.series.map((item, index) => (
            <Line
              key={item.id}
              type="monotone"
              dataKey={item.id}
              name={item.id}
              stroke={item.color}
              strokeWidth={index < 3 ? 2.4 : 1.7}
              strokeOpacity={index < 3 ? 1 : 0.78}
              dot={false}
              activeDot={{ r: 3.5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="comparison-note">
        {comparison.activeCount > MAX_SERIES ? `Showing the top ${MAX_SERIES} of ${comparison.activeCount} active ${subject}. ` : ''}
        Accumulated values restart at the beginning of the selected time window.
      </p>
    </ChartContainer>
  )
}
