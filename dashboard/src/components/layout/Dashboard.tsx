import { useMetrics } from '../../hooks/useMetrics'
import { useFilteredData } from '../../hooks/useFilteredData'
import { useFilters } from '../../context/FilterContext'
import { Header } from './Header'
import { FilterBar } from './FilterBar'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { SummaryCards } from '../cards/SummaryCards'
import { ActivityStats } from '../cards/ActivityStats'
import { CommitsHistogram } from '../charts/CommitsHistogram'
import { LinesOverTime } from '../charts/LinesOverTime'
import { CodingByDayOfWeek } from '../charts/CodingByDayOfWeek'
import { CodingByHourOfDay } from '../charts/CodingByHourOfDay'
import { RepoComparison } from '../charts/RepoComparison'
import { ContributorChart } from '../charts/ContributorChart'
import { LanguageBreakdown } from '../charts/LanguageBreakdown'

export function Dashboard() {
  const { data, loading, error } = useMetrics()
  const filters = useFilters()
  const { weekly, dayOfWeek, hourOfDay, repoTotals, contributors, languages, summary } = useFilteredData(data, filters)

  if (loading) return <LoadingSpinner />
  if (error) return <div className="text-red-500 p-8">Failed to load metrics: {error}</div>
  if (!data) return null

  const repoNames = Object.keys(data.repos).sort()

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Header owner={data.owner} generatedAt={data.generated_at} />
      <FilterBar repos={repoNames} />
      <SummaryCards stats={summary} weekCount={weekly.length} />
      <ActivityStats weekly={weekly} dateRange={filters.dateRange} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <CommitsHistogram data={weekly} />
        <LinesOverTime data={weekly} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <CodingByDayOfWeek data={dayOfWeek} weekCount={weekly.length} />
        <CodingByHourOfDay data={hourOfDay} weekCount={weekly.length} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RepoComparison data={repoTotals} />
        <ContributorChart data={contributors} />
        <LanguageBreakdown data={languages} />
      </div>
    </div>
  )
}
