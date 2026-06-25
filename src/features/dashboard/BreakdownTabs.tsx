import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpRight } from 'lucide-react'
import { Table } from '#/ui/Table'
import type { ColumnMeta } from '#/ui/Table'
import { Tab, Tabs } from '#/ui/Tabs'
import type { DashboardTicket } from '#/lib/graphql'
import {
  DASHBOARD_DIMENSIONS,
  DIMENSION_ORDER,
  computeBreakdown,
} from './dimensions'
import type { BreakdownRow, DimensionKey } from './dimensions'
import styles from './Dashboard.module.css'

const intFmt = (n: number) =>
  n.toLocaleString(undefined, { maximumFractionDigits: 0 })

const numericMeta: ColumnMeta = { align: 'right' }
const labelMeta: ColumnMeta = { mono: true }

export interface BreakdownTabsProps {
  readonly tickets: ReadonlyArray<DashboardTicket>
  readonly loading?: boolean
  readonly refreshing?: boolean
}

export function BreakdownTabs({
  tickets,
  loading = false,
  refreshing = false,
}: BreakdownTabsProps) {
  const [tab, setTab] = useState<DimensionKey>('product')
  const spec = DASHBOARD_DIMENSIONS[tab]
  const rows = useMemo(() => computeBreakdown(tickets, tab), [tickets, tab])
  const maxUnits = useMemo(
    () => rows.reduce((m, r) => (r.units > m ? r.units : m), 0),
    [rows],
  )

  const columns = useMemo<Array<ColumnDef<BreakdownRow, unknown>>>(
    () => [
      {
        accessorKey: 'id',
        header: spec.idHeader,
        size: 128,
        meta: labelMeta,
        cell: (info) => (
          <span className={styles.bdName}>
            {info.row.original.id ?? `#${info.row.original.key}`}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: spec.nameHeader,
        size: 140,
        cell: (info) => (
          <span className={styles.bdSubname}>
            {info.row.original.name ?? ''}
          </span>
        ),
      },
      {
        accessorKey: 'loads',
        header: 'Loads',
        size: 60,
        meta: numericMeta,
        cell: (info) => intFmt(info.getValue<number>()),
      },
      {
        accessorKey: 'units',
        header: 'Units',
        size: 78,
        meta: numericMeta,
        cell: (info) => intFmt(info.getValue<number>()),
      },
      {
        id: 'share',
        header: '',
        size: 48,
        enableSorting: false,
        cell: (info) => {
          const units = info.row.original.units
          const pct = maxUnits > 0 ? (units / maxUnits) * 100 : 0
          return (
            <div
              className={styles.bdBarTrack}
              style={{ '--bar': `${pct}%` } as CSSProperties}
              aria-hidden="true"
            >
              <span className={styles.bdBarFill} />
            </div>
          )
        },
      },
      {
        id: 'jump',
        header: '',
        size: 48,
        enableSorting: false,
        cell: (info) => {
          const r = info.row.original
          const labelText = r.id ?? `#${r.key}`
          return (
            <Link
              to="/tickets"
              className={styles.bdJumpLink}
              aria-label={`Open ${labelText} in tickets`}
              title={`Open ${labelText} in tickets`}
              onClick={(e) => e.stopPropagation()}
            >
              <ArrowUpRight size={14} />
            </Link>
          )
        },
      },
    ],
    [spec.idHeader, spec.nameHeader, maxUnits],
  )

  return (
    <section className={styles.section}>
      <Tabs ariaLabel="Breakdown dimension">
        {DIMENSION_ORDER.map((t) => (
          <Tab key={t} active={t === tab} onClick={() => setTab(t)}>
            {DASHBOARD_DIMENSIONS[t].label}
          </Tab>
        ))}
      </Tabs>
      <div className={styles.breakdownTableSlot}>
        <Table
          data={rows}
          columns={columns}
          hideToolbar
          refreshing={refreshing}
          estimateRowHeight={24}
          emptyState={
            loading ? (
              <span className={styles.refreshingTag}>loading…</span>
            ) : (
              <>No tickets in this range.</>
            )
          }
        />
      </div>
    </section>
  )
}
