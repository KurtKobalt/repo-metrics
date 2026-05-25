import { useState, useEffect } from 'react'
import type { MetricsData } from '../types/metrics'

interface UseMetricsResult {
  data: MetricsData | null
  loading: boolean
  error: string | null
}

export function useMetrics(): UseMetricsResult {
  const [data, setData] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const base = import.meta.env.BASE_URL || '/'
    const url = `${base}metrics.json`
    fetch(url, { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: MetricsData) => {
        setData(d)
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [])

  return { data, loading, error }
}
