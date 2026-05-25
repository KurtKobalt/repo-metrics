import { useEffect, useRef, useState } from 'react'
import { useFilters } from '../../context/FilterContext'
import { useMetrics } from '../../hooks/useMetrics'
import { parseWeekDate } from '../../utils/dateUtils'

type PresetKey = '30d' | '90d' | '6m' | '1y' | 'all' | 'custom'

const PRESETS: { key: PresetKey; label: string; days?: number }[] = [
  { key: '30d', label: '30d', days: 30 },
  { key: '90d', label: '90d', days: 90 },
  { key: '6m', label: '6m', days: 182 },
  { key: '1y', label: '1y', days: 365 },
  { key: 'all', label: 'All' },
  { key: 'custom', label: 'Custom' },
]

function toInputValue(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export function DateRangePicker() {
  const { dateRange, setDateRange } = useFilters()
  const { data } = useMetrics()
  const [active, setActive] = useState<PresetKey>('all')
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const earliest = data?.data_range.earliest_week
    ? parseWeekDate(data.data_range.earliest_week)
    : new Date('2020-01-01')

  function applyPreset(key: PresetKey) {
    setActive(key)
    if (key === 'custom') {
      setOpen(true)
      return
    }
    setOpen(false)
    const to = new Date()
    if (key === 'all') {
      setDateRange({ from: earliest, to })
      return
    }
    const preset = PRESETS.find(p => p.key === key)
    if (!preset?.days) return
    const from = new Date(to.getTime() - preset.days * 86400000)
    setDateRange({ from, to })
  }

  function handleInputChange(field: 'from' | 'to', value: string) {
    if (!value) return
    const d = new Date(value + 'T00:00:00')
    if (isNaN(d.getTime())) return
    setActive('custom')
    setDateRange({ ...dateRange, [field]: d })
  }

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const days = daysBetween(dateRange.from, dateRange.to)

  return (
    <div className="flex items-center gap-2 text-sm relative" ref={popoverRef}>
      <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
        {PRESETS.map(p => (
          <button
            key={p.key}
            type="button"
            onClick={() => applyPreset(p.key)}
            className={
              'px-2.5 py-1.5 text-xs border-r last:border-r-0 border-gray-300 dark:border-gray-600 transition-colors ' +
              (active === p.key
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700')
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">
        {toInputValue(dateRange.from)} → {toInputValue(dateRange.to)} · {days}d
      </span>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-20 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg flex items-center gap-2">
          <label className="flex flex-col text-xs text-gray-500 dark:text-gray-400">
            From
            <input
              type="date"
              value={toInputValue(dateRange.from)}
              onChange={e => handleInputChange('from', e.target.value)}
              className="mt-1 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm [color-scheme:light] dark:[color-scheme:dark]"
            />
          </label>
          <label className="flex flex-col text-xs text-gray-500 dark:text-gray-400">
            To
            <input
              type="date"
              value={toInputValue(dateRange.to)}
              onChange={e => handleInputChange('to', e.target.value)}
              className="mt-1 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm [color-scheme:light] dark:[color-scheme:dark]"
            />
          </label>
        </div>
      )}
    </div>
  )
}
