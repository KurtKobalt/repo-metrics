import { RepoSelector } from '../filters/RepoSelector'
import { DateRangePicker } from '../filters/DateRangePicker'

interface Props {
  repos: string[]
}

export function FilterBar({ repos }: Props) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
      <RepoSelector repos={repos} />
      <DateRangePicker />
    </div>
  )
}
