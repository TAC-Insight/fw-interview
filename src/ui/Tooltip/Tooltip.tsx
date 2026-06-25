import type { ReactElement, ReactNode } from 'react'
import { Tooltip as Base } from '@base-ui/react/tooltip'
import styles from './Tooltip.module.css'

export interface TooltipProps {
  content: ReactNode
  children: ReactElement<Record<string, unknown>>
  side?: 'top' | 'right' | 'bottom' | 'left'
  delay?: number
}

/** Thin styled wrapper over Base UI's Tooltip primitive. */
export function Tooltip({
  content,
  children,
  side = 'top',
  delay = 300,
}: TooltipProps) {
  if (content == null || content === '') return children
  return (
    <Base.Root>
      <Base.Trigger render={children} delay={delay} />
      <Base.Portal>
        <Base.Positioner side={side} sideOffset={6}>
          <Base.Popup className={styles.popup}>
            <Base.Arrow className={styles.arrow} />
            {content}
          </Base.Popup>
        </Base.Positioner>
      </Base.Portal>
    </Base.Root>
  )
}
