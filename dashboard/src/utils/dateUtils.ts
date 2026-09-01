import type { DateRange } from '../types/metrics'

const DAY_MS = 86_400_000

export function parseISODate(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function startOfWeek(date: Date): Date {
  return addDays(date, -date.getDay())
}

export function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / DAY_MS))
}

export function isWithinRange(date: string, from: Date, to: Date): boolean {
  const value = parseISODate(date)
  return value >= from && value <= to
}

export function getDefaultDateRange(): DateRange {
  const to = new Date()
  to.setHours(0, 0, 0, 0)
  return { from: addDays(to, -364), to }
}

export function formatDateRange(range: DateRange): string {
  const format = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${format.format(range.from)} – ${format.format(range.to)}`
}
