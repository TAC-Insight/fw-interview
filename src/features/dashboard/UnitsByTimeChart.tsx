import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DashboardTicket } from '#/lib/graphql'
import styles from './Dashboard.module.css'

interface Point {
  readonly date: string
  readonly units: number
  readonly loads: number
}

const intFmt = (n: number) =>
  n.toLocaleString(undefined, { maximumFractionDigits: 0 })

interface ChartTooltipProps {
  readonly active?: boolean
  readonly payload?: ReadonlyArray<{ readonly payload?: Point }>
  readonly label?: string | number
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0]?.payload
  if (!p) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      <div className={styles.tooltipValue}>
        {intFmt(p.units)} units · {intFmt(p.loads)} loads
      </div>
    </div>
  )
}

/** Units-by-day area chart. Groups the filtered ticket set by `ticketDate`
 *  and sums `netWeight`. */
export function UnitsByTimeChart({
  tickets,
  loading = false,
  refreshing = false,
}: {
  readonly tickets: ReadonlyArray<DashboardTicket>
  readonly loading?: boolean
  readonly refreshing?: boolean
}) {
  const data = useMemo<ReadonlyArray<Point>>(() => {
    const byDate = new Map<string, { units: number; loads: number }>()
    for (const t of tickets) {
      const cur = byDate.get(t.ticketDate) ?? { units: 0, loads: 0 }
      cur.units += t.netWeight
      cur.loads += 1
      byDate.set(t.ticketDate, cur)
    }
    const out: Array<Point> = []
    for (const [date, v] of byDate) {
      out.push({ date, units: v.units, loads: v.loads })
    }
    out.sort((a, b) => a.date.localeCompare(b.date))
    return out
  }, [tickets])

  const totals = useMemo(() => {
    let units = 0
    let loads = 0
    for (const p of data) {
      units += p.units
      loads += p.loads
    }
    return { units, loads, days: data.length }
  }, [data])

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Units by date</h2>
        <span className={styles.sectionMeta}>
          {loading ? (
            <span className={styles.refreshingTag}>loading…</span>
          ) : (
            <>
              {intFmt(totals.units)} units · {intFmt(totals.loads)} loads
              {totals.days > 0 ? ` · ${totals.days} days` : ''}
              {refreshing && (
                <span className={styles.refreshingTag}> · refreshing…</span>
              )}
            </>
          )}
        </span>
      </header>
      <div className={styles.chartArea}>
        {loading && data.length === 0 ? (
          <div className={styles.chartPulse} aria-hidden="true" />
        ) : data.length === 0 ? (
          <div className={styles.chartEmpty}>No tickets in this range.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart
              data={[...data]}
              margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
            >
              <defs>
                <linearGradient id="unitsByTime" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-primary)"
                    stopOpacity={0.14}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-primary)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="var(--color-border-light)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="var(--color-text-tertiary)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis
                stroke="var(--color-text-tertiary)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tickFormatter={intFmt}
                width={48}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="units"
                stroke="var(--color-primary)"
                strokeWidth={1.5}
                fill="url(#unitsByTime)"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
