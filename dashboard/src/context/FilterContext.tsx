import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { DateRange, FilterState } from '../types/metrics'
import { getDefaultDateRange } from '../utils/dateUtils'

interface FilterContextValue extends FilterState {
  setSelectedRepos: (repos: string[]) => void
  setSelectedPeople: (people: string[]) => void
  setDateRange: (range: DateRange) => void
  resetFilters: () => void
  hasFilters: boolean
}

const FilterContext = createContext<FilterContextValue | null>(null)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedRepos, setSelectedRepos] = useState<string[]>([])
  const [selectedPeople, setSelectedPeople] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange)

  const resetFilters = useCallback(() => {
    setSelectedRepos([])
    setSelectedPeople([])
    setDateRange(getDefaultDateRange())
  }, [])

  const value = useMemo(
    () => ({
      selectedRepos,
      selectedPeople,
      dateRange,
      setSelectedRepos,
      setSelectedPeople,
      setDateRange,
      resetFilters,
      hasFilters: selectedRepos.length > 0 || selectedPeople.length > 0,
    }),
    [dateRange, resetFilters, selectedPeople, selectedRepos],
  )

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}

export function useFilters(): FilterContextValue {
  const context = useContext(FilterContext)
  if (!context) throw new Error('useFilters must be used within FilterProvider')
  return context
}
