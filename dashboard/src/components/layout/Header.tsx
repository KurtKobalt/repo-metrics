import { useTheme } from '../../context/ThemeContext'
import type { MetricsData } from '../../types/metrics'
import { formatDateTime } from '../../utils/formatters'

export function Header({ data }: { data: MetricsData }) {
  const { theme, toggleTheme } = useTheme()
  return (
    <header className="site-header">
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true">OV</span>
        <div>
          <p className="brand-name">ONEVISA</p>
          <p className="brand-product">Engineering pulse</p>
        </div>
      </div>
      <div className="header-status" aria-label="Data status">
        <span className="status-pill"><i className="status-dot" />{data.repo_count} repositories connected</span>
        <span className="last-updated">Updated {formatDateTime(data.generated_at)}</span>
        <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          <span aria-hidden="true">{theme === 'dark' ? '☼' : '◐'}</span>
        </button>
      </div>
    </header>
  )
}
