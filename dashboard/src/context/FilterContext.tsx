import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { DateRange, FilterState } from '../types/metrics'
import { getDefaultDateRange } from '../utils/dateUtils'

interface FilterContextValue extends FilterState {
  setSelectedRepos: (repos: string[]) => void
  setDateRange: (range: DateRange) => void
  resetFilters: () => void
}

const defaults = {
  selectedRepos: [] as string[],
  dateRange: getDefaultDateRange(),
}

const FilterContext = createContext<FilterContextValue | null>(null)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedRepos, setSelectedRepos] = useState<string[]>(defaults.selectedRepos)
  const [dateRange, setDateRange] = useState<DateRange>(defaults.dateRange)

  const resetFilters = useCallback(() => {
    setSelectedRepos(defaults.selectedRepos)
    setDateRange(getDefaultDateRange())
  }, [])

  return (
    <FilterContext.Provider value={{ selectedRepos, dateRange, setSelectedRepos, setDateRange, resetFilters }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilters must be used within FilterProvider')
  return ctx
}
