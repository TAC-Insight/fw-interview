import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'fw-interview.theme'

export type Theme = 'light' | 'dark'
export type ThemePreference = 'system' | 'light' | 'dark'

const readStoredPreference = (): ThemePreference => {
  if (typeof window === 'undefined') return 'system'
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
}

const systemTheme = (): Theme =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'

const applyTheme = (theme: Theme): void => {
  document.documentElement.dataset.theme = theme
}

/**
 * Theme state for the shell. Tracks a 3-state preference (`system`,
 * `light`, `dark`) persisted to localStorage and resolves it to the
 * applied `theme` (`light` | `dark`). When the preference is `system`,
 * follows `prefers-color-scheme` and updates live as the OS flips.
 */
export function useTheme(): {
  readonly preference: ThemePreference
  readonly theme: Theme
  readonly cyclePreference: () => void
} {
  const [preference, setPreference] =
    useState<ThemePreference>(readStoredPreference)
  const [system, setSystem] = useState<Theme>(systemTheme)
  const theme = preference === 'system' ? system : preference

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (preference !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) =>
      setSystem(e.matches ? 'dark' : 'light')
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [preference])

  const cyclePreference = useCallback(() => {
    setPreference((prev) => {
      const next: ThemePreference =
        prev === 'system' ? 'light' : prev === 'light' ? 'dark' : 'system'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  return { preference, theme, cyclePreference }
}
