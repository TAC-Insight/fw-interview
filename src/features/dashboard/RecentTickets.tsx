import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpRight } from 'lucide-react'
import { Table } from '#/ui/Table'
import type { ColumnMeta } from '#/ui/Table'
import type { DashboardTicket } from '#/lib/graphql'
import styles from './Dashboard.module.css'

const intFmt = (n: number) =>
  n.toLocaleString(undefined, { maximumFractionDigits: 0 })

const numericMeta: ColumnMeta = { align: 'right' }
const monoMeta: ColumnMeta = { mono: true }

function formatTime(dateTime: string | null, dateOnly: string): string {
  // Show short month/day + 24h time when available; otherwise the date.
  if (!dateTime) return dateOnly.slice(5)
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(dateTime)
  if (!m) return dateOnly.slice(5)
  return `${m[2]}-${m[3]} ${m[4]}:${m[5]}`
}

export interface RecentTicketsProps {
  readonly tickets: ReadonlyArray<DashboardTicket>
  readonly loading?: boolean
  readonly refreshing?: boolean
}

export function RecentTickets({
  tickets,
  loading = false,
  refreshing = false,
}: RecentTicketsProps) {
  const columns = useMemo<Array<ColumnDef<DashboardTicket, unknown>>>(
    () => [
      {
        accessorKey: 'ticketNumber',
        header: 'Ticket',
        size: 78,
        meta: monoMeta,
        cell: (info) => info.getValue<number>(),
      },
      {
        accessorKey: 'ticketDateTime',
        header: 'Time',
        size: 108,
        meta: monoMeta,
        cell: (info) =>
          formatTime(
            info.getValue<string | null>(),
            info.row.original.ticketDate,
          ),
      },
      {
        accessorKey: 'customerName',
        header: 'Customer',
        size: 100,
        cell: (info) =>
          info.getValue<string | null>() ?? (
            <span className={styles.bdPlaceholder}>—</span>
          ),
      },
      {
        accessorKey: 'productID',
        header: 'Product',
        size: 86,
        meta: monoMeta,
        cell: (info) =>
          info.getValue<string | null>() ?? (
            <span className={styles.bdPlaceholder}>—</span>
          ),
      },
      {
        accessorKey: 'netWeight',
        header: 'Units',
        size: 64,
        meta: numericMeta,
        cell: (info) => intFmt(info.getValue<number>()),
      },
      {
        id: 'jump',
        header: '',
        size: 36,
        enableSorting: false,
        cell: (info) => {
          const r = info.row.original
          return (
            <Link
              to="/tickets"
              className={styles.bdJumpLink}
              aria-label={`Open ticket #${r.ticketNumber}`}
              title={`Open ticket #${r.ticketNumber}`}
              onClick={(e) => e.stopPropagation()}
            >
              <ArrowUpRight size={14} />
            </Link>
          )
        },
      },
    ],
    [],
  )

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Recent tickets</h2>
        <Link to="/tickets" className={styles.sectionMetaLink}>
          View all →
        </Link>
      </header>
      <div className={styles.breakdownTableSlot}>
        <Table
          data={tickets}
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
