import { useMemo } from 'react'
import type { MetricsData, FilterState } from '../types/metrics'
import {
  getFilteredWeekly,
  getFilteredPunchCard,
  getFilteredContributors,
  getFilteredLanguages,
  getRepoTotals,
  getDayOfWeekData,
  getHourOfDayData,
  getSummaryStats,
} from '../utils/dataTransformers'

export function useFilteredData(data: MetricsData | null, filters: FilterState) {
  const weekly = useMemo(
    () => (data ? getFilteredWeekly(data, filters) : []),
    [data, filters]
  )

  const punchCard = useMemo(
    () => (data ? getFilteredPunchCard(data, filters) : []),
    [data, filters]
  )

  const contributors = useMemo(
    () => (data ? getFilteredContributors(data, filters) : []),
    [data, filters]
  )

  const languages = useMemo(
    () => (data ? getFilteredLanguages(data, filters) : {}),
    [data, filters]
  )

  const repoTotals = useMemo(
    () => (data ? getRepoTotals(data, filters) : []),
    [data, filters]
  )

  const dayOfWeek = useMemo(() => getDayOfWeekData(punchCard), [punchCard])
  const hourOfDay = useMemo(() => getHourOfDayData(punchCard), [punchCard])

  const summary = useMemo(
    () => (data ? getSummaryStats(weekly, data, filters) : null),
    [data, weekly, filters]
  )

  return { weekly, punchCard, contributors, languages, repoTotals, dayOfWeek, hourOfDay, summary }
}
