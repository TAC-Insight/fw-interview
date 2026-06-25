import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { LeftNav } from './LeftNav'
import { useNavState } from './useNavState'
import styles from './AppLayout.module.css'

/**
 * Authenticated layout — a resizable/collapsible left rail and a content
 * panel. Ported from the production app's AppLayout, minus the command palette and
 * bootstrap overlay. There is no top bar: pages fill the panel directly.
 */
export function AppLayout({ children }: { children: ReactNode }) {
  const nav = useNavState()
  const [resizing, setResizing] = useState(false)
  const widthAtStart = useRef(nav.width)
  const xAtStart = useRef(0)

  const onResizeStart = useCallback(
    (e: ReactMouseEvent) => {
      if (nav.collapsed) return
      setResizing(true)
      widthAtStart.current = nav.width
      xAtStart.current = e.clientX
    },
    [nav.collapsed, nav.width],
  )

  useEffect(() => {
    if (!resizing) return
    const onMove = (e: MouseEvent) => {
      nav.setWidth(widthAtStart.current + (e.clientX - xAtStart.current))
    }
    const onUp = () => {
      setResizing(false)
      nav.persistWidth()
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [resizing, nav])

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!nav.isMobile || !nav.mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') nav.closeMobile()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav])

  return (
    <div
      className={styles.layout}
      data-resizing={resizing ? 'true' : undefined}
      data-mobile={nav.isMobile ? 'true' : undefined}
    >
      {nav.isMobile && !nav.mobileOpen && (
        <button
          type="button"
          className={styles.mobileTrigger}
          onClick={nav.openMobile}
          aria-label="Open menu"
          title="Open menu"
        >
          <Menu size={18} />
        </button>
      )}
      <LeftNav
        collapsed={nav.collapsed}
        onToggleCollapsed={nav.toggleCollapsed}
        isMobile={nav.isMobile}
        mobileOpen={nav.mobileOpen}
        onCloseMobile={nav.closeMobile}
      />
      {nav.isMobile && nav.mobileOpen && (
        <button
          type="button"
          className={styles.scrim}
          onClick={nav.closeMobile}
          aria-label="Close menu"
          tabIndex={-1}
        />
      )}
      {!nav.collapsed && !nav.isMobile && (
        <div
          className={styles.resizeHandle}
          style={{ left: `${nav.width}px` }}
          onMouseDown={onResizeStart}
          aria-hidden="true"
        />
      )}
      <main className={styles.content}>
        <div className={styles.panel}>{children}</div>
      </main>
    </div>
  )
}
