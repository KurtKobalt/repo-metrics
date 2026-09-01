import { FilterProvider } from './context/FilterContext'
import { ThemeProvider } from './context/ThemeContext'
import { Dashboard } from './components/layout/Dashboard'

export default function App() {
  return (
    <ThemeProvider>
      <FilterProvider>
        <div className="app-shell">
          <Dashboard />
        </div>
      </FilterProvider>
    </ThemeProvider>
  )
}
