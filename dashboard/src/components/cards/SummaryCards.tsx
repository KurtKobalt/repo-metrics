import { MetricCard } from './MetricCard'
import { formatNumber } from '../../utils/formatters'

interface SummaryStats {
  totalCommits: number
  totalAdditions: number
  totalDeletions: number
  totalChurn: number
  activeRepos: number
  mostActive: string
}

interface Props {
  stats: SummaryStats | null
  weekCount: number
}

export function SummaryCards({ stats, weekCount }: Props) {
  if (!stats) return null

  const days = weekCount * 7
  const avgCommitsDay = days > 0 ? (stats.totalCommits / days).toFixed(1) : '0'
  const avgLinesDay = days > 0 ? formatNumber(Math.round((stats.totalAdditions + stats.totalDeletions) / days)) : '0'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
      <MetricCard label="Total Commits" value={formatNumber(stats.totalCommits)} />
      <MetricCard label="Avg Commits / Day" value={avgCommitsDay} />
      <MetricCard label="Avg Lines / Day" value={avgLinesDay} />
      <MetricCard label="Additions" value={formatNumber(stats.totalAdditions)} />
      <MetricCard label="Deletions" value={formatNumber(stats.totalDeletions)} />
      <MetricCard label="Total Churn" value={formatNumber(stats.totalChurn)} />
      <MetricCard label="Active Repos" value={stats.activeRepos} />
      <MetricCard label="Most Active" value={stats.mostActive} />
    </div>
  )
}
