import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { resolveDatePreset } from '#/ui/DateRangePicker'
import { BreakdownTabs } from '#/features/dashboard/BreakdownTabs'
import { DashboardFilters } from '#/features/dashboard/DashboardFilters'
import { RecentTickets } from '#/features/dashboard/RecentTickets'
import { SummaryCards } from '#/features/dashboard/SummaryCards'
import { UnitsByTimeChart } from '#/features/dashboard/UnitsByTimeChart'
import { useDashboardData } from '#/features/dashboard/useDashboardData'
import type { DashboardFilters as Filters } from '#/lib/graphql'
import styles from '#/features/dashboard/Dashboard.module.css'

export const Route = createFileRoute('/_app/')({ component: Home })

function Home() {
  // Default the date range to week-to-date.
  const [filters, setFilters] = useState<Filters>(() => {
    const wtd = resolveDatePreset('wtd')
    return {
      fromDate: wtd.from,
      toDate: wtd.to,
      regionKeys: [],
      locationKeys: [],
    }
  })

  const { tickets, loading, refreshing, error, reload } =
    useDashboardData(filters)

  return (
    <main className={styles.page}>
      <div className={styles.scroller}>
        <DashboardFilters
          value={filters}
          onChange={setFilters}
          onRefresh={reload}
          refreshing={refreshing}
        />
        {error && (
          <div className={styles.chartEmpty}>
            Couldn’t load tickets — {error}
          </div>
        )}
        <SummaryCards tickets={tickets} loading={loading} />
        <div className={styles.row2}>
          <BreakdownTabs
            tickets={tickets}
            loading={loading}
            refreshing={refreshing}
          />
          <RecentTickets
            tickets={tickets}
            loading={loading}
            refreshing={refreshing}
          />
        </div>
        <UnitsByTimeChart
          tickets={tickets}
          loading={loading}
          refreshing={refreshing}
        />
      </div>
    </main>
  )
}
