import { useEffect, useRef, useState } from 'react'
import { useFilters } from '../../context/FilterContext'
import { addDays, daysBetween, parseISODate, toISODate } from '../../utils/dateUtils'

type Preset = '30d' | '90d' | '6m' | '1y' | 'all' | 'custom'

const PRESETS: { key: Preset; label: string; days?: number }[] = [
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
  { key: '6m', label: '6M', days: 182 },
  { key: '1y', label: '1Y', days: 365 },
  { key: 'all', label: 'ALL' },
]

interface Props {
  earliest: string | null
  latest: string | null
}

export function DateRangePicker({ earliest, latest }: Props) {
  const { dateRange, setDateRange } = useFilters()
  const [active, setActive] = useState<Preset>('1y')
  const [customOpen, setCustomOpen] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current || !latest) return
    initialized.current = true
    const to = parseISODate(latest)
    setDateRange({ from: addDays(to, -364), to })
  }, [latest, setDateRange])

  function applyPreset(preset: Preset, days?: number) {
    setActive(preset)
    setCustomOpen(false)
    if (preset === 'all' && earliest && latest) {
      setDateRange({ from: parseISODate(earliest), to: parseISODate(latest) })
      return
    }
    if (days && latest) {
      const to = parseISODate(latest)
      setDateRange({ from: addDays(to, -(days - 1)), to })
    }
  }

  function updateDate(field: 'from' | 'to', value: string) {
    if (!value) return
    setActive('custom')
    setDateRange({ ...dateRange, [field]: parseISODate(value) })
  }

  return (
    <div className="date-filter">
      <span className="filter-label">Window</span>
      <div className="date-preset-group" aria-label="Date range">
        {PRESETS.map(preset => (
          <button
            type="button"
            key={preset.key}
            className={active === preset.key ? 'active' : ''}
            onClick={() => applyPreset(preset.key, preset.days)}
          >
            {preset.label}
          </button>
        ))}
        <button type="button" className={active === 'custom' ? 'active' : ''} onClick={() => setCustomOpen(value => !value)}>
          CUSTOM
        </button>
      </div>
      <span className="date-caption">{daysBetween(dateRange.from, dateRange.to) + 1} days</span>
      {customOpen && (
        <div className="date-popover">
          <label>
            From
            <input type="date" value={toISODate(dateRange.from)} onChange={event => updateDate('from', event.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={toISODate(dateRange.to)} onChange={event => updateDate('to', event.target.value)} />
          </label>
        </div>
      )}
    </div>
  )
}
