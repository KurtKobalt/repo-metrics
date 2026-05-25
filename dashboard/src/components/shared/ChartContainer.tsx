import type { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
  isEmpty?: boolean
}

export function ChartContainer({ title, children, isEmpty }: Props) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{title}</h3>
      {isEmpty ? (
        <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-600 text-sm">
          No data available
        </div>
      ) : (
        children
      )}
    </div>
  )
}
