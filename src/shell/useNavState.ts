import { useCallback, useEffect, useState } from 'react'

const COLLAPSED_KEY = 'fw-interview.nav.collapsed'
const WIDTH_KEY = 'fw-interview.nav.width'

const DEFAULT_WIDTH = 192
const MIN_WIDTH = 160
const MAX_WIDTH = 400

const MOBILE_QUERY = '(max-width: 768px)'

const clamp = (n: number) => Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, n))

export interface NavState {
  readonly collapsed: boolean
  readonly width: number
  readonly minWidth: number
  readonly maxWidth: number
  readonly isMobile: boolean
  readonly mobileOpen: boolean
  readonly toggleCollapsed: () => void
  readonly openMobile: () => void
  readonly closeMobile: () => void
  readonly setWidth: (width: number) => void
  readonly persistWidth: () => void
}

/**
 * Sidebar state, mirroring fw-ai's `AppLayout`. Two parallel concerns:
 *
 *  - `collapsed` + `width` — desktop rail. Persisted to localStorage; the
 *    rail toggles between full and icon-only.
 *  - `mobileOpen` — drawer overlay below 768px. Not persisted: every page
 *    load starts closed so the user sees content first. Auto-closes when
 *    the viewport crosses back into desktop.
 */
export function useNavState(): NavState {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(COLLAPSED_KEY) === 'true'
  })
  const [width, setWidthState] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_WIDTH
    const stored = localStorage.getItem(WIDTH_KEY)
    return stored ? clamp(Number(stored)) : DEFAULT_WIDTH
  })

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(MOBILE_QUERY).matches
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
      // Crossing back to desktop — make sure the mobile drawer flag is
      // cleared so it doesn't latch and re-trigger if the viewport
      // shrinks again.
      if (!e.matches) setMobileOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(COLLAPSED_KEY, String(next))
      return next
    })
  }, [])

  const openMobile = useCallback(() => setMobileOpen(true), [])
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  const setWidth = useCallback((next: number) => {
    setWidthState(clamp(next))
  }, [])

  const persistWidth = useCallback(() => {
    setWidthState((current) => {
      localStorage.setItem(WIDTH_KEY, String(current))
      return current
    })
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      collapsed ? 'var(--sidebar-collapsed-width)' : `${width}px`,
    )
  }, [collapsed, width])

  // Lock background scroll while the mobile drawer is open. The layout
  // root is already overflow:hidden, but iOS Safari's rubber-band can
  // still bounce the page; pinning body removes that surprise.
  useEffect(() => {
    if (!isMobile || !mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isMobile, mobileOpen])

  return {
    collapsed,
    width,
    minWidth: MIN_WIDTH,
    maxWidth: MAX_WIDTH,
    isMobile,
    mobileOpen,
    toggleCollapsed,
    openMobile,
    closeMobile,
    setWidth,
    persistWidth,
  }
}
