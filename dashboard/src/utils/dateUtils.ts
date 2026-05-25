export function parseWeekDate(weekStart: string): Date {
  return new Date(weekStart + 'T00:00:00')
}

export function isWithinRange(weekStart: string, from: Date, to: Date): boolean {
  const d = parseWeekDate(weekStart)
  return d >= from && d <= to
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function getDefaultDateRange(): { from: Date; to: Date } {
  return {
    from: new Date('2025-01-07T00:00:00'),
    to: new Date(),
  }
}
