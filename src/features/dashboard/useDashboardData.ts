import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchDashboardTickets } from '#/lib/graphql'
import type { DashboardFilters, DashboardTicket } from '#/lib/graphql'

export interface DashboardData {
  readonly tickets: ReadonlyArray<DashboardTicket>
  /** No data has resolved yet — show skeletons. */
  readonly loading: boolean
  /** Data is visible but a re-fetch is in flight (filter change / refresh). */
  readonly refreshing: boolean
  readonly error: string | null
  readonly reload: () => void
}

/**
 * Fetches the filtered ticket set and re-runs whenever the filters change
 * or `reload()` is called. Cache-less by design — the local-first layer
 * that would sit here is the candidate's task.
 */
export function useDashboardData(filters: DashboardFilters): DashboardData {
  const [tickets, setTickets] = useState<ReadonlyArray<DashboardTicket>>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const hasData = useRef(false)

  // Join the filter values + nonce into a stable string so a fresh
  // `filters` reference holding the same values doesn't refire.
  const key = [
    filters.fromDate,
    filters.toDate,
    filters.regionKeys.join(','),
    filters.locationKeys.join(','),
    nonce,
  ].join('|')

  useEffect(() => {
    let active = true
    if (hasData.current) setRefreshing(true)
    else setLoading(true)
    setError(null)

    fetchDashboardTickets(filters)
      .then((rows) => {
        if (!active) return
        setTickets(rows)
        hasData.current = true
      })
      .catch((e: unknown) => {
        if (!active) return
        setError(e instanceof Error ? e.message : 'Failed to load tickets')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
        setRefreshing(false)
      })

    return () => {
      active = false
    }
    // `key` captures every filter input; `filters` is intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { tickets, loading, refreshing, error, reload }
}
