import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import type { ActivityRow, CommitRecord, DailyMetrics, DateRange, MetricsData } from '../../types/metrics'
import { addDays, daysBetween, startOfWeek, toISODate } from '../../utils/dateUtils'
import { formatCompact, formatDate, formatNumber } from '../../utils/formatters'
import { DayDetailModal } from './DayDetailModal'

type Metric = 'commits' | 'changed_lines' | 'binary'

const METRICS: { key: Metric; label: string; noun: string }[] = [
  { key: 'commits', label: 'Commits', noun: 'commits' },
  { key: 'changed_lines', label: 'Lines changed', noun: 'changed lines' },
  { key: 'binary', label: 'Active / idle', noun: 'active days' },
]

interface Cell {
  date: string
  inRange: boolean
  values: DailyMetrics | undefined
}

interface HoveredDay {
  date: string
  values: DailyMetrics | undefined
  left: number
  top: number
  placement: 'above' | 'below'
}

const COMMIT_TYPE_LABELS = {
  feature: 'Features',
  fix: 'Fixes',
  refactor: 'Refactors',
  test: 'Tests',
  docs: 'Docs',
  chore: 'Chores / CI',
  other: 'Other',
}

function quantile(values: number[], point: number): number {
  if (values.length === 0) return 0
  return values[Math.min(values.length - 1, Math.floor((values.length - 1) * point))]
}

function getLevel(value: number, thresholds: number[]): number {
  if (value <= 0) return 0
  if (value <= thresholds[0]) return 1
  if (value <= thresholds[1]) return 2
  if (value <= thresholds[2]) return 3
  return 4
}

function getMetricValue(values: DailyMetrics | undefined, metric: Metric): number {
  if (metric === 'binary') return (values?.commits ?? 0) > 0 ? 1 : 0
  return values?.[metric] ?? 0
}

export function ContributionHeatmap({
  daily,
  activity,
  commits,
  data,
  dateRange,
}: {
  daily: DailyMetrics[]
  activity: ActivityRow[]
  commits: CommitRecord[]
  data: MetricsData
  dateRange: DateRange
}) {
  const [metric, setMetric] = useState<Metric>('commits')
  const [hoveredDay, setHoveredDay] = useState<HoveredDay | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const scrollArea = useRef<HTMLDivElement>(null)
  const selectedMetric = METRICS.find(item => item.key === metric) ?? METRICS[0]
  const closeDayDetails = useCallback(() => setSelectedDay(null), [])

  const rowsByDate = useMemo(() => {
    const grouped = new Map<string, ActivityRow[]>()
    for (const row of activity) grouped.set(row.date, [...(grouped.get(row.date) ?? []), row])
    return grouped
  }, [activity])

  const dayDetails = useMemo(() => {
    if (!hoveredDay) return null
    const rows = rowsByDate.get(hoveredDay.date) ?? []
    const peopleNames = new Map(data.people.map(person => [person.id, person.name]))
    const rank = (dimension: 'repo' | 'person') => {
      const totals = new Map<string, number>()
      for (const row of rows) {
        const id = row[dimension]
        totals.set(id, (totals.get(id) ?? 0) + row.commits)
      }
      return [...totals.entries()]
        .sort(([, left], [, right]) => right - left)
        .slice(0, 3)
        .map(([id, commits]) => ({
          id,
          commits,
          name: dimension === 'repo' ? (data.repos[id]?.display_name ?? id) : (peopleNames.get(id) ?? id),
        }))
    }
    const intents = hoveredDay.values
      ? Object.entries(hoveredDay.values.commit_types)
        .filter(([, commits]) => commits > 0)
        .sort(([, left], [, right]) => right - left)
        .slice(0, 4)
        .map(([type, commits]) => ({ label: COMMIT_TYPE_LABELS[type as keyof typeof COMMIT_TYPE_LABELS], commits }))
      : []
    return { repos: rank('repo'), people: rank('person'), intents }
  }, [data.people, data.repos, hoveredDay, rowsByDate])

  const { weeks, monthLabels, thresholds, total } = useMemo(() => {
    const byDate = new Map(daily.map(row => [row.date, row]))
    const selectedStart = startOfWeek(dateRange.from)
    const selectedEnd = addDays(dateRange.to, 6 - dateRange.to.getDay())
    const selectedWeeks = Math.ceil((daysBetween(selectedStart, selectedEnd) + 1) / 7)
    const weekCount = Math.max(1, selectedWeeks)
    const gridStart = selectedStart
    const weekColumns: Cell[][] = []
    const months: string[] = []
    for (let week = 0; week < weekCount; week += 1) {
      const weekStart = addDays(gridStart, week * 7)
      months.push(weekStart.getDate() <= 7 ? weekStart.toLocaleDateString('en', { month: 'short' }) : '')
      weekColumns.push(Array.from({ length: 7 }, (_, day) => {
        const date = addDays(weekStart, day)
        const iso = toISODate(date)
        return { date: iso, inRange: date >= dateRange.from && date <= dateRange.to, values: byDate.get(iso) }
      }))
    }
    const nonZero = daily.map(row => getMetricValue(row, metric)).filter(value => value > 0).sort((a, b) => a - b)
    return {
      weeks: weekColumns,
      monthLabels: months,
      thresholds: [quantile(nonZero, 0.25), quantile(nonZero, 0.5), quantile(nonZero, 0.75)],
      total: daily.reduce((sum, row) => sum + getMetricValue(row, metric), 0),
    }
  }, [daily, dateRange, metric])

  const selectedDayCount = daysBetween(dateRange.from, dateRange.to) + 1
  const activeDayPercentage = selectedDayCount > 0 ? Math.round((total / selectedDayCount) * 100) : 0
  const headlineValue = metric === 'binary'
    ? `${formatNumber(total)}/${formatNumber(selectedDayCount)} (${activeDayPercentage}%)`
    : formatCompact(total)

  useEffect(() => {
    const element = scrollArea.current
    if (element && element.scrollWidth > element.clientWidth) element.scrollLeft = element.scrollWidth
  }, [weeks.length])

  function showDay(event: MouseEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>, cell: Cell) {
    if (!cell.inRange) return
    const rect = event.currentTarget.getBoundingClientRect()
    const halfWidth = Math.min(170, Math.max(120, (window.innerWidth - 24) / 2))
    const left = Math.max(halfWidth + 12, Math.min(window.innerWidth - halfWidth - 12, rect.left + rect.width / 2))
    const placement = rect.top > 310 ? 'above' : 'below'
    setHoveredDay({
      date: cell.date,
      values: cell.values,
      left,
      top: placement === 'above' ? rect.top - 8 : rect.bottom + 8,
      placement,
    })
  }

  return (
    <section className="heatmap-panel" aria-label={metric === 'binary' ? `${formatNumber(total)} of ${formatNumber(selectedDayCount)} active days, ${activeDayPercentage} percent, in the selected period` : `${formatNumber(total)} ${selectedMetric.noun} in the selected period`}>
      <div className="heatmap-heading">
        <div>
          <p className="eyebrow">CONTRIBUTION ACTIVITY</p>
          <h2><span>{headlineValue}</span> {selectedMetric.noun} across the selected scope</h2>
          <p>Daily engineering activity, unified across repository transfers and contributor aliases.</p>
        </div>
        <div className="metric-switcher" aria-label="Heatmap metric">
          {METRICS.map(item => (
            <button type="button" key={item.key} className={metric === item.key ? 'active' : ''} onClick={() => setMetric(item.key)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollArea} className="heatmap-scroll">
        <div className="heatmap-chart" style={{ '--heatmap-weeks': weeks.length } as CSSProperties}>
          <div className="heatmap-month-spacer" />
          <div className="heatmap-months">
            {monthLabels.map((month, index) => <span key={`${month}-${index}`}>{month}</span>)}
          </div>
          <div className="heatmap-days" aria-hidden="true">
            <span />
            <span>Mon</span>
            <span />
            <span>Wed</span>
            <span />
            <span>Fri</span>
            <span />
          </div>
          <div className="heatmap-weeks">
            {weeks.map((week, weekIndex) => (
              <div className="heatmap-week" key={weekIndex}>
                {week.map(cell => {
                  const value = getMetricValue(cell.values, metric)
                  const level = cell.inRange ? getLevel(value, thresholds) : -1
                  const binaryClass = metric === 'binary' && cell.inRange
                    ? (value > 0 ? 'binary-active' : 'binary-idle')
                    : ''
                  const cellSummary = metric === 'binary'
                    ? (value > 0 ? 'Contribution recorded' : 'No contribution')
                    : `${formatNumber(value)} ${selectedMetric.noun}`
                  return (
                    <button
                      type="button"
                      key={cell.date}
                      className={`heatmap-cell level-${level} ${binaryClass}`}
                      title={`${formatDate(cell.date)} · ${cellSummary}`}
                      aria-label={`${formatDate(cell.date)}: ${cellSummary}. Focus for the daily breakdown.`}
                      aria-describedby={hoveredDay?.date === cell.date ? 'heatmap-day-tooltip' : undefined}
                      disabled={!cell.inRange}
                      onClick={() => {
                        setHoveredDay(null)
                        setSelectedDay(cell.date)
                      }}
                      onMouseEnter={event => showDay(event, cell)}
                      onMouseLeave={() => setHoveredDay(null)}
                      onFocus={event => showDay(event, cell)}
                      onBlur={() => setHoveredDay(null)}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="heatmap-footer">
        <span>{weeks.length} weeks displayed · the complete selected history · click a day for details</span>
        {metric === 'binary' ? (
          <div className="heatmap-legend binary-legend" aria-label="Contribution status legend">
            <i className="heatmap-cell binary-idle" /><span>No contribution</span>
            <i className="heatmap-cell binary-active" /><span>Contribution</span>
          </div>
        ) : (
          <div className="heatmap-legend" aria-label="Contribution intensity legend">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map(level => <i key={level} className={`heatmap-cell level-${level}`} />)}
            <span>More</span>
          </div>
        )}
      </div>

      {hoveredDay && dayDetails && createPortal(
        <aside
          id="heatmap-day-tooltip"
          role="tooltip"
          className={`heatmap-tooltip ${hoveredDay.placement}`}
          style={{ left: hoveredDay.left, top: hoveredDay.top }}
        >
          <div className="heatmap-tooltip-heading">
            <div>
              <span>DAILY BREAKDOWN</span>
              <strong>{formatDate(hoveredDay.date, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</strong>
            </div>
          </div>

          {(hoveredDay.values?.commits ?? 0) === 0 ? (
            <p className="heatmap-tooltip-empty">No recorded activity in the selected scope.</p>
          ) : (
            <>
              <div className="heatmap-tooltip-stats">
                <span><strong>{formatNumber(hoveredDay.values?.commits ?? 0)}</strong><small>commits</small></span>
                <span><strong>{formatNumber(hoveredDay.values?.files_changed ?? 0)}</strong><small>files touched</small></span>
                <span><strong>{formatCompact(hoveredDay.values?.changed_lines ?? 0)}</strong><small>lines changed</small></span>
                <span><strong>{formatNumber(hoveredDay.values?.merge_commits ?? 0)}</strong><small>merges</small></span>
              </div>
              <div className="heatmap-tooltip-impact">
                <span className="added-number">+{formatCompact(hoveredDay.values?.lines_added ?? 0)} added</span>
                <span className="updated-number">~{formatCompact(hoveredDay.values?.updated_lines ?? 0)} updated</span>
                <span className="deleted-number">−{formatCompact(hoveredDay.values?.lines_deleted ?? 0)} deleted</span>
              </div>
              <div className="heatmap-tooltip-breakdown">
                <div>
                  <span>Top contributors</span>
                  {dayDetails.people.map(item => <p key={item.id}><b>{item.name}</b><small>{item.commits}</small></p>)}
                </div>
                <div>
                  <span>Top repositories</span>
                  {dayDetails.repos.map(item => <p key={item.id}><b>{item.name}</b><small>{item.commits}</small></p>)}
                </div>
              </div>
              {dayDetails.intents.length > 0 && (
                <div className="heatmap-tooltip-intents">
                  {dayDetails.intents.map(item => <span key={item.label}>{item.label} · {item.commits}</span>)}
                </div>
              )}
            </>
          )}
        </aside>,
        document.body,
      )}

      {selectedDay && (
        <DayDetailModal
          date={selectedDay}
          activity={activity}
          commits={commits}
          data={data}
          onClose={closeDayDetails}
        />
      )}
    </section>
  )
}
