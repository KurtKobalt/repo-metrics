import { useMemo } from 'react'
import { useFilters } from '../../context/FilterContext'
import { useFilteredData } from '../../hooks/useFilteredData'
import { useMetrics } from '../../hooks/useMetrics'
import { formatDateRange } from '../../utils/dateUtils'
import { DataCoverage, SummaryCards } from '../cards'
import {
  CommitVelocity,
  ComparisonChart,
  ContributionHeatmap,
  ContributorPanel,
  HourlyActivity,
  LanguageBreakdown,
  LineImpactChart,
  RepositoryTable,
  WorkPatterns,
} from '../charts'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { FilterBar } from './FilterBar'
import { Header } from './Header'

export function Dashboard() {
  const { data, loading, error } = useMetrics()
  const filters = useFilters()
  const { activity, commits, daily, weekly, repoTotals, contributorTotals, weekdayData, commitTypeData, hourlyData, summary } = useFilteredData(data, filters)

  const languages = useMemo(() => {
    if (!data) return {}
    const selected = filters.selectedRepos.length > 0 ? filters.selectedRepos : Object.keys(data.repos)
    const result: Record<string, number> = {}
    for (const repoId of selected) {
      for (const [language, bytes] of Object.entries(data.repos[repoId]?.languages ?? {})) {
        result[language] = (result[language] ?? 0) + bytes
      }
    }
    return result
  }, [data, filters.selectedRepos])

  if (loading) return <LoadingSpinner />
  if (error) {
    return (
      <div className="error-screen">
        <span aria-hidden="true">!</span>
        <h1>Metrics could not be loaded</h1>
        <p>{error}</p>
      </div>
    )
  }
  if (!data) return null

  const selectedRepoLabel = filters.selectedRepos.length === 0 ? 'All repositories' : `${filters.selectedRepos.length} repositories`
  const selectedPeopleLabel = filters.selectedPeople.length === 0 ? 'Everyone' : `${filters.selectedPeople.length} people`

  return (
    <>
      <Header data={data} />
      <main>
        <div className="dashboard-intro">
          <div>
            <p className="eyebrow">ENGINEERING INTELLIGENCE</p>
            <h1>See the work behind the product.</h1>
            <p>Commit activity, code impact, and team contribution across the entire OneVisa product surface.</p>
          </div>
          <div className="scope-summary">
            <span>{selectedRepoLabel}</span>
            <i aria-hidden="true">/</i>
            <span>{selectedPeopleLabel}</span>
            <i aria-hidden="true">/</i>
            <span>{formatDateRange(filters.dateRange)}</span>
          </div>
        </div>

        <FilterBar data={data} />
        <ContributionHeatmap daily={daily} activity={activity} commits={commits} data={data} dateRange={filters.dateRange} />
        <SummaryCards stats={summary} />

        <div className="dashboard-grid trend-grid">
          <LineImpactChart data={weekly} note={data.line_metric_note} />
          <CommitVelocity data={weekly} />
        </div>

        <ComparisonChart rows={activity} data={data} dateRange={filters.dateRange} />

        <HourlyActivity data={hourlyData} />

        <div className="dashboard-grid detail-grid">
          <RepositoryTable data={repoTotals} repos={data.repos} />
          <ContributorPanel data={contributorTotals} people={data.people} />
        </div>

        <div className="dashboard-grid pattern-grid">
          <WorkPatterns weekdays={weekdayData} types={commitTypeData} />
          <LanguageBreakdown data={languages} />
        </div>

        <DataCoverage data={data} />
        <footer className="dashboard-footer">
          <span>OneVisa engineering pulse</span>
          <p>Canonical Git history unified across repository transfers and contributor aliases. Metrics are deduplicated by SHA.</p>
        </footer>
      </main>
    </>
  )
}
