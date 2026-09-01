import type { NamedMetrics, Person } from '../../types/metrics'
import { formatCompact, formatNumber } from '../../utils/formatters'
import { ChartContainer } from '../shared/ChartContainer'

export function ContributorPanel({ data, people }: { data: NamedMetrics[]; people: Person[] }) {
  const peopleById = new Map(people.map(person => [person.id, person]))
  const max = Math.max(1, ...data.map(person => person.commits))
  return (
    <ChartContainer eyebrow="TEAM" title="Contribution mix" description="Aliases are rolled up into one person." isEmpty={data.length === 0}>
      <div className="contributor-list">
        {data.slice(0, 12).map((person, index) => {
          const profile = peopleById.get(person.id)
          return (
            <div className="contributor-row" key={person.id}>
              <span className="rank">{String(index + 1).padStart(2, '0')}</span>
              <span className={`person-avatar ${profile?.kind === 'automation' ? 'automation' : ''}`}>{person.name.slice(0, 2).toUpperCase()}</span>
              <div className="person-info">
                <div><strong>{person.name}</strong><span>{formatNumber(person.commits)} commits</span></div>
                <div className="person-bar"><i style={{ width: `${(person.commits / max) * 100}%` }} /></div>
              </div>
              <span className="person-lines">{formatCompact(person.changed_lines)}<small>lines</small></span>
            </div>
          )
        })}
      </div>
    </ChartContainer>
  )
}
