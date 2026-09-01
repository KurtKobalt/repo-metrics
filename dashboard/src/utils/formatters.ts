import { parseISODate } from './dateUtils'

const integer = new Intl.NumberFormat('en')

export function formatNumber(value: number): string {
  return integer.format(value)
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}K`
  return String(value)
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`
  return `${bytes} B`
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions): string {
  return parseISODate(value).toLocaleDateString('en', options ?? { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatWeekLabel(value: string): string {
  return formatDate(value, { month: 'short', day: 'numeric' })
}
