import { useMemo } from 'react'
import { useFilters } from '../../context/FilterContext'
import type { Person } from '../../types/metrics'
import { formatCompact } from '../../utils/formatters'
import { MultiSelect } from './MultiSelect'

export function PersonSelector({ people }: { people: Person[] }) {
  const { selectedPeople, setSelectedPeople } = useFilters()
  const options = useMemo(
    () => people.map(person => ({
      value: person.id,
      label: person.name,
      secondary: `${formatCompact(person.commits)} commits`,
      kind: person.kind,
    })),
    [people],
  )
  return (
    <MultiSelect
      label="People"
      allLabel="Everyone"
      options={options}
      selected={selectedPeople}
      onChange={setSelectedPeople}
    />
  )
}
