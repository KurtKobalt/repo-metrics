import type { MetricsData } from '../../types/metrics'
import { formatDate } from '../../utils/formatters'

export function DataCoverage({ data }: { data: MetricsData }) {
  const earliest = data.data_range.earliest_date ? formatDate(data.data_range.earliest_date) : 'unknown'
  const latest = data.data_range.latest_date ? formatDate(data.data_range.latest_date) : 'unknown'
  return (
    <section className="coverage-strip">
      <div>
        <span className="coverage-icon" aria-hidden="true">✓</span>
        <p><strong>History coverage</strong><span>{earliest} → {latest}</span></p>
      </div>
      <div>
        <span className="coverage-icon migration" aria-hidden="true">↗</span>
        <p><strong>Repository continuity</strong><span>onevisa-ai + legacy Beto owners unified</span></p>
      </div>
      <div>
        <span className="coverage-icon line-model" aria-hidden="true">≋</span>
        <p><strong>Line attribution</strong><span>added, estimated updated, and deleted separated</span></p>
      </div>
      {data.warnings.length > 0 && (
        <div className="coverage-warning">
          <span className="coverage-icon" aria-hidden="true">!</span>
          <p><strong>{data.warnings.length} data warning{data.warnings.length === 1 ? '' : 's'}</strong><span>{data.warnings[0]}</span></p>
        </div>
      )}
    </section>
  )
}
