import { useMemo } from 'react'
import type { WeeklyEntry, DateRange } from '../../types/metrics'

interface Props {
  weekly: WeeklyEntry[]
  dateRange: DateRange
}

export function ActivityStats({ weekly, dateRange }: Props) {
  const stats = useMemo(() => {
    if (weekly.length === 0) return null

    const weeksWithData = weekly.filter(w => {
      const dc = w.daily_commits || {}
      return w.commits > 0 || Object.values(dc).some(v => v > 0)
    })

    const totalWeekdays = weeksWithData.length * 5
    const totalWeekends = weeksWithData.length

    let activeWeekdays = 0
    let activeWeekends = 0

    for (const w of weeksWithData) {
      const dc = w.daily_commits || {}
      for (const d of ['mon', 'tue', 'wed', 'thu', 'fri']) {
        if ((dc[d] || 0) > 0) activeWeekdays++
      }
      if ((dc['sat'] || 0) > 0 || (dc['sun'] || 0) > 0) activeWeekends++
    }

    const dayPct = totalWeekdays > 0 ? (activeWeekdays / totalWeekdays) * 100 : 0
    const weekendPct = totalWeekends > 0 ? (activeWeekends / totalWeekends) * 100 : 0
    const totalCalendarDays = Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / 86400000)
    const coveredWeeks = weeksWithData.length

    return { activeWeekdays, totalWeekdays, dayPct, activeWeekends, totalWeekends, weekendPct, totalCalendarDays, coveredWeeks }
  }, [weekly, dateRange])

  if (!stats) return null

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-4 px-1">
      <span>
        Active weekdays: <strong className="text-gray-700 dark:text-gray-200">{stats.activeWeekdays}/{stats.totalWeekdays}</strong>{' '}
        ({stats.dayPct.toFixed(1)}%)
      </span>
      <span>
        Active weekends: <strong className="text-gray-700 dark:text-gray-200">{stats.activeWeekends}/{stats.totalWeekends}</strong>{' '}
        ({stats.weekendPct.toFixed(1)}%)
      </span>
      <span>
        {stats.coveredWeeks}w with data of {stats.totalCalendarDays}d range
      </span>
    </div>
  )
}
