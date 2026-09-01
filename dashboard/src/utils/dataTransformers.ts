import type {
  ActivityMetrics,
  ActivityRow,
  CommitRecord,
  CommitType,
  DailyMetrics,
  FilterState,
  HourlyMetrics,
  MetricsData,
  NamedMetrics,
  SummaryStats,
  WeeklyMetrics,
} from '../types/metrics'
import { addDays, daysBetween, isWithinRange, parseISODate, startOfWeek, toISODate } from './dateUtils'

export const COMMIT_TYPES: CommitType[] = ['feature', 'fix', 'refactor', 'test', 'docs', 'chore', 'other']

const NUMBER_FIELDS: (keyof Omit<ActivityMetrics, 'commit_types'>)[] = [
  'commits',
  'local_commits',
  'merge_commits',
  'additions',
  'deletions',
  'updated_lines',
  'lines_added',
  'lines_deleted',
  'changed_lines',
  'files_changed',
]

export function emptyActivityMetrics(): ActivityMetrics {
  return {
    commits: 0,
    local_commits: 0,
    merge_commits: 0,
    additions: 0,
    deletions: 0,
    updated_lines: 0,
    lines_added: 0,
    lines_deleted: 0,
    changed_lines: 0,
    files_changed: 0,
    commit_types: { feature: 0, fix: 0, refactor: 0, test: 0, docs: 0, chore: 0, other: 0 },
  }
}

export function addMetrics(target: ActivityMetrics, source: ActivityMetrics): void {
  for (const field of NUMBER_FIELDS) target[field] += source[field]
  for (const type of COMMIT_TYPES) target.commit_types[type] += source.commit_types[type] ?? 0
}

export function getFilteredActivity(data: MetricsData, filters: FilterState): ActivityRow[] {
  const repos = new Set(filters.selectedRepos)
  const people = new Set(filters.selectedPeople)
  return data.activity.filter(
    row =>
      (repos.size === 0 || repos.has(row.repo)) &&
      (people.size === 0 || people.has(row.person)) &&
      isWithinRange(row.date, filters.dateRange.from, filters.dateRange.to),
  )
}

export function getFilteredCommits(data: MetricsData, filters: FilterState): CommitRecord[] {
  const repos = new Set(filters.selectedRepos)
  const people = new Set(filters.selectedPeople)
  return data.commit_log.filter(
    commit =>
      (repos.size === 0 || repos.has(commit.repo)) &&
      (people.size === 0 || people.has(commit.person)) &&
      isWithinRange(commit.date, filters.dateRange.from, filters.dateRange.to),
  )
}

export function getHourlyData(commits: CommitRecord[]): HourlyMetrics[] {
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, commits: 0, changed_lines: 0 }))
  for (const commit of commits) {
    hourly[commit.hour].commits += 1
    hourly[commit.hour].changed_lines += commit.changed_lines
  }
  return hourly
}

export function getDailyMetrics(rows: ActivityRow[]): DailyMetrics[] {
  const daily = new Map<string, DailyMetrics>()
  for (const row of rows) {
    const item = daily.get(row.date) ?? { date: row.date, ...emptyActivityMetrics() }
    addMetrics(item, row)
    daily.set(row.date, item)
  }
  return [...daily.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function getWeeklyMetrics(rows: ActivityRow[]): WeeklyMetrics[] {
  const weekly = new Map<string, WeeklyMetrics>()
  for (const row of rows) {
    const week = toISODate(startOfWeek(parseISODate(row.date)))
    const item = weekly.get(week) ?? { week_start: week, ...emptyActivityMetrics() }
    addMetrics(item, row)
    weekly.set(week, item)
  }
  return [...weekly.values()].sort((a, b) => a.week_start.localeCompare(b.week_start))
}

export function getRepoTotals(rows: ActivityRow[], data: MetricsData): NamedMetrics[] {
  const totals = new Map<string, NamedMetrics>()
  for (const row of rows) {
    const item = totals.get(row.repo) ?? {
      id: row.repo,
      name: data.repos[row.repo]?.display_name ?? row.repo,
      ...emptyActivityMetrics(),
    }
    addMetrics(item, row)
    totals.set(row.repo, item)
  }
  return [...totals.values()].sort((a, b) => b.commits - a.commits)
}

export function getContributorTotals(rows: ActivityRow[], data: MetricsData): NamedMetrics[] {
  const peopleById = new Map(data.people.map(person => [person.id, person]))
  const totals = new Map<string, NamedMetrics>()
  for (const row of rows) {
    const item = totals.get(row.person) ?? {
      id: row.person,
      name: peopleById.get(row.person)?.name ?? row.person,
      ...emptyActivityMetrics(),
    }
    addMetrics(item, row)
    totals.set(row.person, item)
  }
  return [...totals.values()].sort((a, b) => b.commits - a.commits)
}

function calculateStreaks(dates: string[], rangeEnd: Date): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 }
  const unique = [...new Set(dates)].sort()
  let longest = 1
  let run = 1
  for (let index = 1; index < unique.length; index += 1) {
    if (daysBetween(parseISODate(unique[index - 1]), parseISODate(unique[index])) === 1) {
      run += 1
      longest = Math.max(longest, run)
    } else {
      run = 1
    }
  }

  const active = new Set(unique)
  let cursor = new Date(rangeEnd)
  let current = 0
  while (active.has(toISODate(cursor))) {
    current += 1
    cursor = addDays(cursor, -1)
  }
  return { current, longest }
}

export function getSummaryStats(rows: ActivityRow[], data: MetricsData, filters: FilterState): SummaryStats {
  const totals = emptyActivityMetrics()
  const dates = new Set<string>()
  const repos = new Set<string>()
  const people = new Set<string>()
  const humanIds = new Set(data.people.filter(person => person.kind === 'human').map(person => person.id))
  for (const row of rows) {
    addMetrics(totals, row)
    if (row.commits > 0) {
      dates.add(row.date)
      repos.add(row.repo)
      if (humanIds.has(row.person)) people.add(row.person)
    }
  }
  const daily = getDailyMetrics(rows)
  const busiest = [...daily].sort((a, b) => b.commits - a.commits)[0]
  const repoTotals = getRepoTotals(rows, data)
  const streaks = calculateStreaks([...dates], filters.dateRange.to)
  const rangeDays = daysBetween(filters.dateRange.from, filters.dateRange.to) + 1
  return {
    ...totals,
    active_days: dates.size,
    contributors: people.size,
    active_repos: repos.size,
    activity_rate: rangeDays > 0 ? (dates.size / rangeDays) * 100 : 0,
    current_streak: streaks.current,
    longest_streak: streaks.longest,
    average_commit_size: totals.commits > 0 ? Math.round(totals.changed_lines / totals.commits) : 0,
    top_repo: repoTotals[0]?.name ?? '—',
    busiest_day: busiest ? { date: busiest.date, commits: busiest.commits } : null,
  }
}

export function getWeekdayData(daily: DailyMetrics[]): { day: string; commits: number }[] {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const totals = Array<number>(7).fill(0)
  for (const row of daily) totals[parseISODate(row.date).getDay()] += row.commits
  return names.map((day, index) => ({ day, commits: totals[index] }))
}

export function getCommitTypeData(rows: ActivityRow[]): { type: CommitType; commits: number }[] {
  const totals = emptyActivityMetrics().commit_types
  for (const row of rows) {
    for (const type of COMMIT_TYPES) totals[type] += row.commit_types[type] ?? 0
  }
  return COMMIT_TYPES.map(type => ({ type, commits: totals[type] })).sort((a, b) => b.commits - a.commits)
}
