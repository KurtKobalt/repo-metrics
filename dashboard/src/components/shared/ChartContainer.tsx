import type { ReactNode } from 'react'

interface Props {
  title: string
  eyebrow?: string
  description?: string
  children: ReactNode
  action?: ReactNode
  isEmpty?: boolean
  className?: string
}

export function ChartContainer({ title, eyebrow, description, children, action, isEmpty, className = '' }: Props) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
          {description && <p className="panel-description">{description}</p>}
        </div>
        {action && <div className="panel-action">{action}</div>}
      </div>
      {isEmpty ? (
        <div className="empty-state">
          <span className="empty-state-mark" aria-hidden="true">···</span>
          No activity for this selection
        </div>
      ) : children}
    </section>
  )
}
