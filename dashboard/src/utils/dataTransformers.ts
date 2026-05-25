import type { MetricsData, WeeklyEntry, FilterState } from '../types/metrics'
import { isWithinRange } from './dateUtils'

export function getFilteredWeekly(data: MetricsData, filters: FilterState): WeeklyEntry[] {
  const { selectedRepos, dateRange } = filters
  const allRepos = Object.keys(data.repos)
  const repos = selectedRepos.length > 0 ? selectedRepos : allRepos
  const useAggregate = repos.length === allRepos.length

  if (useAggregate) {
    return data.aggregate.weekly.filter(w => isWithinRange(w.week_start, dateRange.from, dateRange.to))
  }

  const merged: Record<string, WeeklyEntry> = {}
  for (const repoName of repos) {
    const repo = data.repos[repoName]
    if (!repo) continue
    for (const w of repo.weekly) {
      if (!isWithinRange(w.week_start, dateRange.from, dateRange.to)) continue
      if (!merged[w.week_start]) {
        merged[w.week_start] = { ...w, daily_commits: { ...w.daily_commits } }
      } else {
        const m = merged[w.week_start]
        m.commits += w.commits
        m.additions += w.additions
        m.deletions += w.deletions
        m.churn += w.churn
        for (const [day, count] of Object.entries(w.daily_commits || {})) {
          m.daily_commits[day] = (m.daily_commits[day] || 0) + count
        }
      }
    }
  }
  return Object.values(merged).sort((a, b) => a.week_start.localeCompare(b.week_start))
}

export function getFilteredPunchCard(data: MetricsData, filters: FilterState): [number, number, number][] {
  const { selectedRepos } = filters
  const allRepos = Object.keys(data.repos)
  const repos = selectedRepos.length > 0 ? selectedRepos : allRepos
  if (repos.length === allRepos.length) return data.aggregate.punch_card

  const merged: Record<string, number> = {}
  for (const repoName of repos) {
    const repo = data.repos[repoName]
    if (!repo) continue
    for (const [day, hour, commits] of repo.punch_card) {
      const key = `${day}-${hour}`
      merged[key] = (merged[key] || 0) + commits
    }
  }
  return Object.entries(merged)
    .map(([key, commits]) => {
      const [d, h] = key.split('-').map(Number)
      return [d, h, commits] as [number, number, number]
    })
    .sort((a, b) => a[0] * 24 + a[1] - (b[0] * 24 + b[1]))
}

export function getFilteredContributors(data: MetricsData, filters: FilterState) {
  const { selectedRepos } = filters
  const allRepos = Object.keys(data.repos)
  const repos = selectedRepos.length > 0 ? selectedRepos : allRepos
  if (repos.length === allRepos.length) return data.aggregate.contributors

  const merged: Record<string, { login: string; avatar_url: string; commits: number }> = {}
  for (const repoName of repos) {
    const repo = data.repos[repoName]
    if (!repo) continue
    for (const c of repo.contributors) {
      if (!merged[c.login]) {
        merged[c.login] = { ...c }
      } else {
        merged[c.login].commits += c.commits
      }
    }
  }
  return Object.values(merged).sort((a, b) => b.commits - a.commits)
}

export function getFilteredLanguages(data: MetricsData, filters: FilterState): Record<string, number> {
  const { selectedRepos } = filters
  const allRepos = Object.keys(data.repos)
  const repos = selectedRepos.length > 0 ? selectedRepos : allRepos
  if (repos.length === allRepos.length) return data.aggregate.languages

  const merged: Record<string, number> = {}
  for (const repoName of repos) {
    const repo = data.repos[repoName]
    if (!repo) continue
    for (const [lang, bytes] of Object.entries(repo.languages)) {
      merged[lang] = (merged[lang] || 0) + bytes
    }
  }
  return Object.fromEntries(Object.entries(merged).sort(([, a], [, b]) => b - a))
}

export function getRepoTotals(data: MetricsData, filters: FilterState): { name: string; commits: number; churn: number; additions: number; deletions: number }[] {
  const { selectedRepos, dateRange } = filters
  const allRepos = Object.keys(data.repos)
  const repos = selectedRepos.length > 0 ? selectedRepos : allRepos

  return repos
    .map(name => {
      const repo = data.repos[name]
      if (!repo) return null
      const filtered = repo.weekly.filter(w => isWithinRange(w.week_start, dateRange.from, dateRange.to))
      const commits = filtered.reduce((s, w) => s + w.commits, 0)
      const additions = filtered.reduce((s, w) => s + w.additions, 0)
      const deletions = filtered.reduce((s, w) => s + w.deletions, 0)
      return { name, commits, additions, deletions, churn: additions + deletions }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.commits - a.commits)
}

export function getDayOfWeekData(punchCard: [number, number, number][]): { day: string; commits: number }[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const byDay = Array(7).fill(0)
  for (const [day, , commits] of punchCard) {
    byDay[day] += commits
  }
  return days.map((day, i) => ({ day, commits: byDay[i] }))
}

export function getHourOfDayData(punchCard: [number, number, number][]): { hour: string; commits: number }[] {
  const byHour = Array(24).fill(0)
  for (const [, hour, commits] of punchCard) {
    byHour[hour] += commits
  }
  return byHour.map((commits, i) => ({ hour: `${i}:00`, commits }))
}

export function getSummaryStats(weekly: WeeklyEntry[], data: MetricsData, filters: FilterState) {
  const { selectedRepos } = filters
  const allRepos = Object.keys(data.repos)
  const repos = selectedRepos.length > 0 ? selectedRepos : allRepos

  const totalCommits = weekly.reduce((s, w) => s + w.commits, 0)
  const totalAdditions = weekly.reduce((s, w) => s + w.additions, 0)
  const totalDeletions = weekly.reduce((s, w) => s + w.deletions, 0)
  const totalChurn = totalAdditions + totalDeletions
  const activeRepos = repos.filter(name => {
    const repo = data.repos[name]
    return repo && repo.weekly.some(w => w.commits > 0)
  }).length

  const repoTotals = getRepoTotals(data, filters)
  const mostActive = repoTotals.length > 0 ? repoTotals[0].name : '-'

  return { totalCommits, totalAdditions, totalDeletions, totalChurn, activeRepos, mostActive }
}
