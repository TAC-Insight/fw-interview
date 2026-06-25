import { useMemo } from 'react'
import type { DashboardTicket } from '#/lib/graphql'
import styles from './Dashboard.module.css'

interface StatCellProps {
  readonly label: string
  readonly value: number
  readonly loading?: boolean
  readonly formatOptions?: Intl.NumberFormatOptions
}

function StatCell({ label, value, loading, formatOptions }: StatCellProps) {
  return (
    <div className={styles.statCell}>
      <span className={styles.statValue}>
        {loading ? (
          <span className={styles.statPulse} />
        ) : (
          value.toLocaleString(undefined, formatOptions)
        )}
      </span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}

const intFmt: Intl.NumberFormatOptions = { maximumFractionDigits: 0 }

/** Top-of-page stat strip: loads (count), net units (sum), and active
 *  customers / orders / trucks / products (distinct). */
export function SummaryCards({
  tickets,
  loading = false,
}: {
  readonly tickets: ReadonlyArray<DashboardTicket>
  readonly loading?: boolean
}) {
  const stats = useMemo(() => {
    const customers = new Set<number>()
    const orders = new Set<number>()
    const trucks = new Set<number>()
    const products = new Set<number>()
    let netUnits = 0
    for (const t of tickets) {
      if (t.customerKey !== null) customers.add(t.customerKey)
      if (t.orderKey !== null) orders.add(t.orderKey)
      if (t.truckKey !== null) trucks.add(t.truckKey)
      if (t.productKey !== null) products.add(t.productKey)
      netUnits += t.netWeight
    }
    return {
      loads: tickets.length,
      netUnits,
      customers: customers.size,
      orders: orders.size,
      trucks: trucks.size,
      products: products.size,
    }
  }, [tickets])

  return (
    <section className={styles.statStrip}>
      <StatCell label="Total loads" value={stats.loads} loading={loading} />
      <StatCell
        label="Total units"
        value={stats.netUnits}
        loading={loading}
        formatOptions={intFmt}
      />
      <StatCell
        label="Active customers"
        value={stats.customers}
        loading={loading}
      />
      <StatCell label="Active orders" value={stats.orders} loading={loading} />
      <StatCell label="Active trucks" value={stats.trucks} loading={loading} />
      <StatCell
        label="Active products"
        value={stats.products}
        loading={loading}
      />
    </section>
  )
}
