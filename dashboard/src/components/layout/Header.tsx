import { useTheme } from '../../context/ThemeContext'

interface Props {
  owner: string
  generatedAt: string
}

export function Header({ owner, generatedAt }: Props) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
      <div>
        <h1 className="text-2xl font-bold">GitHub Metrics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {owner} &middot; {new Date(generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <button
        onClick={toggleTheme}
        className="self-start sm:self-auto px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {theme === 'dark' ? '\u2600 Light' : '\u25CF Dark'}
      </button>
    </header>
  )
}
