import { useMemo } from 'react'
import type { FilterState, MetricsData } from '../types/metrics'
import {
  getCommitTypeData,
  getContributorTotals,
  getDailyMetrics,
  getFilteredActivity,
  getFilteredCommits,
  getHourlyData,
  getRepoTotals,
  getSummaryStats,
  getWeekdayData,
  getWeeklyMetrics,
} from '../utils/dataTransformers'

export function useFilteredData(data: MetricsData | null, filters: FilterState) {
  return useMemo(() => {
    if (!data) {
      return {
        activity: [],
        commits: [],
        daily: [],
        weekly: [],
        repoTotals: [],
        contributorTotals: [],
        weekdayData: [],
        commitTypeData: [],
        hourlyData: [],
        summary: null,
      }
    }
    const activity = getFilteredActivity(data, filters)
    const commits = getFilteredCommits(data, filters)
    const daily = getDailyMetrics(activity)
    return {
      activity,
      commits,
      daily,
      weekly: getWeeklyMetrics(activity),
      repoTotals: getRepoTotals(activity, data),
      contributorTotals: getContributorTotals(activity, data),
      weekdayData: getWeekdayData(daily),
      commitTypeData: getCommitTypeData(activity),
      hourlyData: getHourlyData(commits),
      summary: getSummaryStats(activity, data, filters),
    }
  }, [data, filters])
}
