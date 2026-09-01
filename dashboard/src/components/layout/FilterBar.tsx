import { useFilters } from '../../context/FilterContext'
import type { MetricsData } from '../../types/metrics'
import { DateRangePicker } from '../filters/DateRangePicker'
import { PersonSelector } from '../filters/PersonSelector'
import { RepoSelector } from '../filters/RepoSelector'

export function FilterBar({ data }: { data: MetricsData }) {
  const { hasFilters, resetFilters } = useFilters()
  return (
    <div className="filter-bar">
      <div className="filter-bar-inner">
        <RepoSelector repos={data.repos} />
        <PersonSelector people={data.people} />
        <DateRangePicker earliest={data.data_range.earliest_date} latest={data.data_range.latest_date} />
        {hasFilters && (
          <button type="button" className="reset-filters" onClick={resetFilters}>
            Reset filters
          </button>
        )}
      </div>
    </div>
  )
}
