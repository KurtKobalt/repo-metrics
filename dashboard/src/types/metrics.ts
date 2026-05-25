export interface WeeklyEntry {
  week_start: string
  commits: number
  additions: number
  deletions: number
  churn: number
  daily_commits: Record<string, number>
}

export interface Totals {
  commits: number
  additions: number
  deletions: number
  churn: number
}

export interface Contributor {
  login: string
  avatar_url: string
  commits: number
}

export interface ItemCounts {
  open: number
  closed: number
}

export interface RepoData {
  private: boolean
  fork: boolean
  weekly: WeeklyEntry[]
  totals_13w: Totals
  totals_52w: Totals
  punch_card: [number, number, number][]
  contributors: Contributor[]
  languages: Record<string, number>
  pr_counts: ItemCounts
  issue_counts: ItemCounts
}

export interface AggregateData {
  weekly: WeeklyEntry[]
  totals_13w: Totals
  totals_52w: Totals
  punch_card: [number, number, number][]
  contributors: Contributor[]
  languages: Record<string, number>
  pr_counts: ItemCounts
  issue_counts: ItemCounts
}

export interface MetricsData {
  generated_at: string
  owner: string
  repo_count: number
  data_range: { earliest_week: string | null; latest_week: string | null }
  aggregate: AggregateData
  repos: Record<string, RepoData>
}

export interface DateRange {
  from: Date
  to: Date
}

export interface FilterState {
  selectedRepos: string[]
  dateRange: DateRange
}
