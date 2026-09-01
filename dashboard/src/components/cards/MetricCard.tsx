interface Props {
  label: string
  value: string | number
  detail?: string
  accent?: 'mint' | 'amber' | 'coral' | 'blue' | 'neutral'
}

export function MetricCard({ label, value, detail, accent = 'neutral' }: Props) {
  return (
    <article className={`metric-card metric-${accent}`}>
      <span className="metric-accent" aria-hidden="true" />
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      {detail && <p className="metric-detail">{detail}</p>}
    </article>
  )
}
