import { useEffect, useMemo, useRef, useState } from 'react'

export interface SelectOption {
  value: string
  label: string
  secondary?: string
  kind?: 'human' | 'automation'
}

interface Props {
  label: string
  allLabel: string
  options: SelectOption[]
  selected: string[]
  onChange: (values: string[]) => void
}

export function MultiSelect({ label, allLabel, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false)
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query ? options.filter(option => `${option.label} ${option.secondary ?? ''}`.toLowerCase().includes(query)) : options
  }, [options, search])

  const allSelected = selected.length === 0
  const buttonLabel = allSelected
    ? allLabel
    : selected.length === 1
      ? options.find(option => option.value === selected[0])?.label ?? label
      : `${selected.length} ${label.toLowerCase()}`

  function toggle(value: string) {
    if (allSelected) {
      onChange([value])
      return
    }
    if (selected.includes(value)) {
      const next = selected.filter(item => item !== value)
      onChange(next.length === 0 ? [] : next)
      return
    }
    const next = [...selected, value]
    onChange(next.length === options.length ? [] : next)
  }

  return (
    <div ref={root} className="filter-select">
      <span className="filter-label">{label}</span>
      <button
        type="button"
        className="filter-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        <span className="filter-button-value">{buttonLabel}</span>
        <span aria-hidden="true" className="filter-chevron">⌄</span>
      </button>

      {open && (
        <div className="filter-popover">
          <div className="filter-search-wrap">
            <input
              autoFocus
              className="filter-search"
              type="search"
              placeholder={`Search ${label.toLowerCase()}…`}
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          <button type="button" className="select-all-action" onClick={() => onChange([])}>
            <span className={`check-box ${allSelected ? 'checked' : ''}`} aria-hidden="true">{allSelected ? '✓' : ''}</span>
            {allLabel}
          </button>
          <div className="filter-options" role="listbox" aria-label={label} aria-multiselectable="true">
            {visible.map(option => {
              const checked = allSelected || selected.includes(option.value)
              return (
                <button
                  type="button"
                  key={option.value}
                  role="option"
                  aria-selected={checked}
                  className="filter-option"
                  onClick={() => toggle(option.value)}
                >
                  <span className={`check-box ${checked ? 'checked' : ''}`} aria-hidden="true">{checked ? '✓' : ''}</span>
                  <span className={`option-avatar ${option.kind === 'automation' ? 'automation' : ''}`} aria-hidden="true">
                    {option.label.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="option-copy">
                    <span>{option.label}</span>
                    {option.secondary && <span className="option-secondary">{option.secondary}</span>}
                  </span>
                </button>
              )
            })}
            {visible.length === 0 && <div className="filter-empty">No matches</div>}
          </div>
        </div>
      )}
    </div>
  )
}
