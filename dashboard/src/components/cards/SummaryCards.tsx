import type { SummaryStats } from '../../types/metrics'
import { formatCompact, formatDate, formatNumber } from '../../utils/formatters'
import { MetricCard } from './MetricCard'

export function SummaryCards({ stats }: { stats: SummaryStats | null }) {
  if (!stats) return null
  return (
    <section className="metrics-grid" aria-label="Selected activity summary">
      <MetricCard label="Commits" value={formatNumber(stats.commits)} detail={`${stats.merge_commits} merge commits`} accent="blue" />
      <MetricCard label="Lines added" value={formatCompact(stats.lines_added)} detail={`~${formatCompact(stats.updated_lines)} updated`} accent="amber" />
      <MetricCard label="Active days" value={formatNumber(stats.active_days)} detail={`${stats.activity_rate.toFixed(0)}% of selected days`} accent="mint" />
      <MetricCard label="Changed lines" value={formatCompact(stats.changed_lines)} detail={`${formatCompact(stats.average_commit_size)} per commit`} accent="coral" />
      <MetricCard label="Files touched" value={formatCompact(stats.files_changed)} detail={`${stats.active_repos} active repositories`} />
      <MetricCard label="Contributors" value={stats.contributors} detail={`Longest streak · ${stats.longest_streak}d`} />
      <MetricCard label="Top repository" value={stats.top_repo} detail="By commit count" />
      <MetricCard
        label="Busiest day"
        value={stats.busiest_day ? formatDate(stats.busiest_day.date, { month: 'short', day: 'numeric' }) : '—'}
        detail={stats.busiest_day ? `${stats.busiest_day.commits} commits` : 'No activity'}
      />
    </section>
  )
}
