import { ThemeProvider } from './context/ThemeContext'
import { FilterProvider } from './context/FilterContext'
import { Dashboard } from './components/layout/Dashboard'

function App() {
  return (
    <ThemeProvider>
      <FilterProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
          <Dashboard />
        </div>
      </FilterProvider>
    </ThemeProvider>
  )
}

export default App
