import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import styles from './Tabs.module.css'

/**
 * `Tabs` — flat container that lays out a row of `Tab` / `TabLink`.
 * Adds a 2px border-light separator at the bottom; active tabs paint
 * a 2px primary line in the same row so the highlight and separator
 * merge into a single continuous line.
 *
 * Use `Tab` for controlled in-component switches (button-based,
 * caller-passed `active` prop). Use `TabLink` for route-driven
 * navigation; it inherits TanStack Router's `Link` API and lights up
 * automatically via `activeProps`.
 */
export function Tabs({
  children,
  ariaLabel,
}: {
  readonly children: ReactNode
  readonly ariaLabel?: string
}) {
  return (
    <nav className={styles.tabs} role="tablist" aria-label={ariaLabel}>
      {children}
    </nav>
  )
}

export interface TabProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  readonly active?: boolean
  readonly icon?: ReactNode
  readonly children: ReactNode
}

export function Tab({ active, icon, children, ...rest }: TabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={styles.tab}
      data-active={active ? 'true' : undefined}
      {...rest}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

// TanStack Router's `Link` has a generic type for its router schema.
// Forward the relevant subset via `LinkProps` so callers keep their
// typed `to` / `search` checks. We slot in `activeProps`'s
// `data-active` so the shared CSS lights up the active tab.
export type TabLinkProps = LinkProps & {
  readonly icon?: ReactNode
  readonly children: ReactNode
}

export function TabLink({ icon, children, ...rest }: TabLinkProps) {
  return (
    <Link
      role="tab"
      className={styles.tab}
      activeProps={{
        'data-active': 'true',
        'aria-selected': 'true',
        'aria-current': 'page',
      }}
      {...rest}
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}
