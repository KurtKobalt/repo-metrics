import { useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ActivityRow, CommitRecord, MetricsData } from '../../types/metrics'
import { addMetrics, emptyActivityMetrics, getContributorTotals, getHourlyData, getRepoTotals } from '../../utils/dataTransformers'
import { formatCompact, formatDate, formatNumber } from '../../utils/formatters'

const tooltipStyle = {
  background: 'var(--surface-raised)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  color: 'var(--text)',
}

const TYPE_LABELS = {
  feature: 'Feature',
  fix: 'Fix',
  refactor: 'Refactor',
  test: 'Test',
  docs: 'Docs',
  chore: 'Chore / CI',
  other: 'Other',
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

function formatCommitTime(timestamp: string): string {
  const match = timestamp.match(/T(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : '—'
}

function commitUrl(commit: CommitRecord, data: MetricsData): string | null {
  const github = data.repos[commit.repo]?.github
  return github?.owner && github?.name
    ? `https://github.com/${github.owner}/${github.name}/commit/${commit.sha}`
    : null
}

export function DayDetailModal({
  date,
  activity,
  commits,
  data,
  onClose,
}: {
  date: string
  activity: ActivityRow[]
  commits: CommitRecord[]
  data: MetricsData
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const details = useMemo(() => {
    const dayRows = activity.filter(row => row.date === date)
    const dayCommits = commits
      .filter(commit => commit.date === date)
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    const totals = emptyActivityMetrics()
    for (const row of dayRows) addMetrics(totals, row)
    const repositories = getRepoTotals(dayRows, data)
    const contributors = getContributorTotals(dayRows, data)
    const hourly = getHourlyData(dayCommits)
    const activeHours = hourly.filter(item => item.commits > 0).length
    const peak = [...hourly].sort((left, right) => right.commits - left.commits)[0]
    return { dayCommits, totals, repositories, contributors, hourly, activeHours, peak }
  }, [activity, commits, data, date])

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [onClose])

  const hasActivity = details.totals.commits > 0
  const title = formatDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return createPortal(
    <div
      className="day-modal-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="day-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-modal-title"
        aria-describedby="day-modal-description"
      >
        <header className="day-modal-header">
          <div>
            <p className="eyebrow">DAY IN ENGINEERING</p>
            <h2 id="day-modal-title">{title}</h2>
            <p id="day-modal-description">
              The exact activity inside the repository, person, and time filters currently selected.
            </p>
          </div>
          <button ref={closeButtonRef} type="button" className="day-modal-close" onClick={onClose} aria-label="Close day details">
            <span aria-hidden="true">×</span>
          </button>
        </header>

        {!hasActivity ? (
          <div className="day-modal-empty">
            <span aria-hidden="true">○</span>
            <h3>No recorded contributions</h3>
            <p>Nothing matched the selected scope on this day.</p>
          </div>
        ) : (
          <div className="day-modal-content">
            <section className="day-summary-grid" aria-label="Daily totals">
              <article><span>Commits</span><strong>{formatNumber(details.totals.commits)}</strong><small>{formatNumber(details.totals.merge_commits)} merges</small></article>
              <article><span>Repositories</span><strong>{formatNumber(details.repositories.length)}</strong><small>contributed to</small></article>
              <article><span>Contributors</span><strong>{formatNumber(details.contributors.length)}</strong><small>people and automation</small></article>
              <article><span>Files touched</span><strong>{formatNumber(details.totals.files_changed)}</strong><small>across all commits</small></article>
              <article><span>Lines changed</span><strong>{formatCompact(details.totals.changed_lines)}</strong><small>total code impact</small></article>
            </section>

            <section className="day-timeline-panel" aria-labelledby="day-timeline-title">
              <div className="day-section-heading">
                <div>
                  <span>24-HOUR TIMELINE</span>
                  <h3 id="day-timeline-title">When the work happened</h3>
                  <p>Bars show commits; the line shows changed lines. Hours follow each commit's recorded local clock.</p>
                </div>
                <div className="day-timeline-legend" aria-label="Timeline legend">
                  <span><i className="legend-commits" />Commits</span>
                  <span><i className="legend-lines" />Lines changed</span>
                </div>
              </div>
              <div className="day-timeline-summary">
                <span><strong>{details.activeHours}</strong> active hours</span>
                <span><strong>{formatHour(details.peak.hour)}</strong> peak · {formatNumber(details.peak.commits)} commits</span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={details.hourly} margin={{ top: 12, right: 6, left: -24, bottom: 0 }} accessibilityLayer>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={hour => Number(hour) % 3 === 0 ? formatHour(Number(hour)) : ''}
                    tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis yAxisId="commits" allowDecimals={false} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="lines" orientation="right" tickFormatter={formatCompact} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={hour => `${formatHour(Number(hour))}–${formatHour(Number(hour) + 1)}`}
                    formatter={(value, name) => [formatNumber(Number(value ?? 0)), String(name)]}
                  />
                  <Bar yAxisId="commits" dataKey="commits" name="Commits" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  <Line yAxisId="lines" type="monotone" dataKey="changed_lines" name="Lines changed" stroke="var(--updated)" strokeWidth={2.2} dot={false} activeDot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </section>

            <div className="day-detail-grid">
              <section className="day-repo-impact" aria-labelledby="day-repos-title">
                <div className="day-section-heading compact">
                  <div>
                    <span>REPOSITORY IMPACT</span>
                    <h3 id="day-repos-title">Where the code changed</h3>
                  </div>
                </div>
                <div className="day-table-scroll">
                  <table>
                    <thead><tr><th>Repository</th><th>Commits</th><th>Added</th><th>Updated*</th><th>Deleted</th><th>Changed</th></tr></thead>
                    <tbody>
                      {details.repositories.map(repo => (
                        <tr key={repo.id}>
                          <td><strong>{repo.name}</strong><small>{repo.id}</small></td>
                          <td>{formatNumber(repo.commits)}</td>
                          <td className="added-number">+{formatCompact(repo.lines_added)}</td>
                          <td className="updated-number">~{formatCompact(repo.updated_lines)}</td>
                          <td className="deleted-number">−{formatCompact(repo.lines_deleted)}</td>
                          <td><strong>{formatCompact(repo.changed_lines)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="day-contributors" aria-labelledby="day-contributors-title">
                <div className="day-section-heading compact">
                  <div>
                    <span>CONTRIBUTORS</span>
                    <h3 id="day-contributors-title">Who contributed</h3>
                  </div>
                </div>
                <div className="day-contributor-list">
                  {details.contributors.map((person, index) => (
                    <article key={person.id}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <div><strong>{person.name}</strong><small>{formatNumber(person.commits)} commits · {formatCompact(person.changed_lines)} lines</small></div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <section className="day-commits" aria-labelledby="day-commits-title">
              <div className="day-section-heading compact">
                <div>
                  <span>COMMIT TIMELINE</span>
                  <h3 id="day-commits-title">{formatNumber(details.dayCommits.length)} commits, newest first</h3>
                </div>
              </div>
              <div className="day-commit-list">
                {details.dayCommits.map(commit => {
                  const person = data.people.find(item => item.id === commit.person)
                  const repo = data.repos[commit.repo]
                  const url = commitUrl(commit, data)
                  return (
                    <article className="day-commit-row" key={`${commit.repo}-${commit.sha}`}>
                      <time dateTime={commit.timestamp}>{formatCommitTime(commit.timestamp)}</time>
                      <div className="day-commit-main">
                        <strong>{commit.subject}</strong>
                        <p>
                          <span>{person?.name ?? commit.person}</span>
                          <i aria-hidden="true">/</i>
                          <span>{repo?.display_name ?? commit.repo}</span>
                          <i aria-hidden="true">/</i>
                          {url ? <a href={url} target="_blank" rel="noreferrer">{commit.sha.slice(0, 7)} ↗</a> : <code>{commit.sha.slice(0, 7)}</code>}
                        </p>
                      </div>
                      <div className="day-commit-tags">
                        <span className={`commit-type type-${commit.type}`}>{TYPE_LABELS[commit.type]}</span>
                        {commit.merge && <span>Merge</span>}
                      </div>
                      <div className="day-commit-impact">
                        <strong>{formatCompact(commit.changed_lines)}</strong>
                        <small>
                          <span className="added-number">+{formatCompact(commit.lines_added)}</span>
                          <span className="updated-number">~{formatCompact(commit.updated_lines)}</span>
                          <span className="deleted-number">−{formatCompact(commit.lines_deleted)}</span>
                        </small>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
