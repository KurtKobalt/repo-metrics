import { formatBytes } from '../../utils/formatters'
import { ChartContainer } from '../shared/ChartContainer'

export function LanguageBreakdown({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort(([, a], [, b]) => b - a).slice(0, 8)
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0)
  return (
    <ChartContainer eyebrow="CODEBASE" title="Language footprint" description="Current repository composition, independent of the date filter." isEmpty={entries.length === 0}>
      <div className="language-stack" aria-label="Language distribution">
        {entries.map(([name, bytes], index) => (
          <i key={name} className={`language-color-${index}`} style={{ width: `${(bytes / total) * 100}%` }} title={`${name}: ${formatBytes(bytes)}`} />
        ))}
      </div>
      <div className="language-list">
        {entries.map(([name, bytes], index) => (
          <div key={name}>
            <span><i className={`language-color-${index}`} />{name}</span>
            <strong>{((bytes / total) * 100).toFixed(1)}%</strong>
            <small>{formatBytes(bytes)}</small>
          </div>
        ))}
      </div>
    </ChartContainer>
  )
}
