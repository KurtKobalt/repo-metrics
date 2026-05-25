const fmt = new Intl.NumberFormat()

export function formatNumber(n: number): string {
  return fmt.format(n)
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`
  return `${bytes} B`
}

export function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tooltipFormatter = (value: any) => formatNumber(Number(value ?? 0))
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tooltipLabelFormatter = (label: any) => formatWeekLabel(String(label ?? ''))
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tooltipBytesFormatter = (value: any) => [formatBytes(Number(value ?? 0)), 'Size']
