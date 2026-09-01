import type { CommitType } from '../../types/metrics'
import { formatNumber } from '../../utils/formatters'
import { ChartContainer } from '../shared/ChartContainer'

const TYPE_LABELS: Record<CommitType, string> = {
  feature: 'Features',
  fix: 'Fixes',
  refactor: 'Refactors',
  test: 'Tests',
  docs: 'Docs',
  chore: 'Chores / CI',
  other: 'Other',
}

interface Props {
  weekdays: { day: string; commits: number }[]
  types: { type: CommitType; commits: number }[]
}

export function WorkPatterns({ weekdays, types }: Props) {
  const maxDay = Math.max(1, ...weekdays.map(item => item.commits))
  const maxType = Math.max(1, ...types.map(item => item.commits))
  return (
    <ChartContainer eyebrow="PATTERNS" title="How the team works" description="Cadence by weekday and commit intent." isEmpty={weekdays.every(item => item.commits === 0)}>
      <div className="patterns-grid">
        <div>
          <h3>Weekday cadence</h3>
          <div className="weekday-bars">
            {weekdays.map(item => (
              <div className="weekday-column" key={item.day}>
                <span>{formatNumber(item.commits)}</span>
                <div><i style={{ height: `${Math.max(4, (item.commits / maxDay) * 100)}%` }} /></div>
                <small>{item.day}</small>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3>Commit intent</h3>
          <div className="type-list">
            {types.map(item => (
              <div className="type-row" key={item.type}>
                <span>{TYPE_LABELS[item.type]}</span>
                <div><i className={`type-${item.type}`} style={{ width: `${(item.commits / maxType) * 100}%` }} /></div>
                <strong>{formatNumber(item.commits)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ChartContainer>
  )
}
