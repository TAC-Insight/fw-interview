import type { LucideIcon } from 'lucide-react'
import styles from './EmptyState.module.css'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
}

/** Centered placeholder used by the stubbed pages. */
export function EmptyState({
  icon: Icon,
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
      {Icon && (
        <div className={styles.iconWrap}>
          <Icon size={22} aria-hidden="true" />
        </div>
      )}
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
    </div>
  )
}
