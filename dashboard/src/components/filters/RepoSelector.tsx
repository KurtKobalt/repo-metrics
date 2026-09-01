import { useMemo } from 'react'
import { useFilters } from '../../context/FilterContext'
import type { RepoData } from '../../types/metrics'
import { MultiSelect } from './MultiSelect'

export function RepoSelector({ repos }: { repos: Record<string, RepoData> }) {
  const { selectedRepos, setSelectedRepos } = useFilters()
  const options = useMemo(
    () => Object.entries(repos).map(([value, repo]) => ({ value, label: repo.display_name, secondary: value })),
    [repos],
  )
  return (
    <MultiSelect
      label="Repositories"
      allLabel={`All ${options.length} repositories`}
      options={options}
      selected={selectedRepos}
      onChange={setSelectedRepos}
    />
  )
}
