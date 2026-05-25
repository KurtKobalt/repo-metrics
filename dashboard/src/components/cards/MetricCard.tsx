interface Props {
  label: string
  value: string | number
  subtitle?: string
}

export function MetricCard({ label, value, subtitle }: Props) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {subtitle && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</div>}
    </div>
  )
}
