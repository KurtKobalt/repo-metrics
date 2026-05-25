import { useState, useRef, useEffect } from 'react'
import { useFilters } from '../../context/FilterContext'

interface Props {
  repos: string[]
}

export function RepoSelector({ repos }: Props) {
  const { selectedRepos, setSelectedRepos } = useFilters()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = repos.filter(r => r.toLowerCase().includes(search.toLowerCase()))
  const allSelected = selectedRepos.length === 0
  const label = allSelected ? `All repos (${repos.length})` : selectedRepos.length === 1 ? selectedRepos[0] : `${selectedRepos.length} repos`

  function toggle(repo: string) {
    if (allSelected) {
      setSelectedRepos(repos.filter(r => r !== repo))
    } else if (selectedRepos.includes(repo)) {
      const next = selectedRepos.filter(r => r !== repo)
      setSelectedRepos(next.length === repos.length ? [] : next)
    } else {
      const next = [...selectedRepos, repo]
      setSelectedRepos(next.length === repos.length ? [] : next)
    }
  }

  function isChecked(repo: string) {
    return allSelected || selectedRepos.includes(repo)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-w-[160px] text-left"
      >
        {label}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-2">
          <input
            type="text"
            placeholder="Search repos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded bg-transparent mb-2"
          />
          <div className="flex gap-2 mb-2">
            <button onClick={() => setSelectedRepos([])} className="text-xs text-blue-500 hover:underline">Select all</button>
            <button onClick={() => setSelectedRepos([repos[0]])} className="text-xs text-blue-500 hover:underline">Clear</button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filtered.map(repo => (
              <label key={repo} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-sm">
                <input type="checkbox" checked={isChecked(repo)} onChange={() => toggle(repo)} className="rounded" />
                {repo}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
