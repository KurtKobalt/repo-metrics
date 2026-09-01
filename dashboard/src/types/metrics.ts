export type CommitType = 'feature' | 'fix' | 'refactor' | 'test' | 'docs' | 'chore' | 'other'

export type CommitTypes = Record<CommitType, number>

export interface ActivityMetrics {
  commits: number
  local_commits: number
  merge_commits: number
  additions: number
  deletions: number
  updated_lines: number
  lines_added: number
  lines_deleted: number
  changed_lines: number
  files_changed: number
  commit_types: CommitTypes
}

export interface Totals extends ActivityMetrics {
  active_days: number
}

export interface ActivityRow extends ActivityMetrics {
  date: string
  repo: string
  person: string
}

export interface CommitRecord {
  sha: string
  timestamp: string
  date: string
  hour: number
  repo: string
  person: string
  subject: string
  type: CommitType
  merge: boolean
  additions: number
  deletions: number
  updated_lines: number
  lines_added: number
  lines_deleted: number
  changed_lines: number
  files_changed: number
}

export interface HourlyMetrics {
  hour: number
  commits: number
  changed_lines: number
}

export interface Person {
  id: string
  name: string
  login: string
  avatar_url: string
  kind: 'human' | 'automation'
  commits: number
  local_commits: number
}

export interface ItemCounts {
  open?: number
  closed?: number
}

export interface RepoData {
  display_name: string
  github: {
    owner: string
    name: string
    historical_owners: string[]
  }
  default_ref: string
  totals: Totals
  languages: Record<string, number>
  pr_counts: ItemCounts
  issue_counts: ItemCounts
  warnings: string[]
}

export interface AggregateData {
  totals: Totals
  languages?: Record<string, number>
  pr_counts?: ItemCounts
  issue_counts?: ItemCounts
}

export interface MetricsData {
  schema_version: 3
  generated_at: string
  owner: string
  repo_count: number
  data_range: { earliest_date: string | null; latest_date: string | null }
  data_source: string
  line_metric_note: string
  people: Person[]
  activity: ActivityRow[]
  commit_log: CommitRecord[]
  aggregate: AggregateData
  repos: Record<string, RepoData>
  warnings: string[]
}

export interface DateRange {
  from: Date
  to: Date
}

export interface FilterState {
  selectedRepos: string[]
  selectedPeople: string[]
  dateRange: DateRange
}

export interface DailyMetrics extends ActivityMetrics {
  date: string
}

export interface WeeklyMetrics extends ActivityMetrics {
  week_start: string
}

export interface NamedMetrics extends ActivityMetrics {
  id: string
  name: string
}

export interface SummaryStats extends Totals {
  contributors: number
  active_repos: number
  activity_rate: number
  current_streak: number
  longest_streak: number
  average_commit_size: number
  top_repo: string
  busiest_day: { date: string; commits: number } | null
}
