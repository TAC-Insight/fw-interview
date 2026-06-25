import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import styles from './Table.module.css'

export type Align = 'left' | 'right'

/**
 * `meta` slots attached to column defs for presentation control — the
 * Table reads these to right-align numeric columns and render IDs mono.
 * Ported from the production app's Table; this is a streamlined version (no saved
 * views / toolbar / grouping / column resize) that keeps the same markup
 * and CSS so it looks identical.
 */
export interface ColumnMeta {
  readonly align?: Align
  readonly mono?: boolean
}

type ColumnMetaShape = ColumnMeta
declare module '@tanstack/react-table' {
  // eslint-disable-next-line no-shadow
  interface ColumnMeta<TData, TValue> extends ColumnMetaShape {
    readonly __td?: TData
    readonly __tv?: TValue
  }
}

export interface TableProps<TData> {
  readonly data: ReadonlyArray<TData>
  readonly columns: ReadonlyArray<ColumnDef<TData, unknown>>
  readonly estimateRowHeight?: number
  readonly emptyState?: ReactNode
  readonly onRowClick?: (row: TData) => void
  readonly refreshing?: boolean
  readonly footer?:
    | ReactNode
    | ((ctx: { rowCount: number; refreshing: boolean }) => ReactNode)
  /** Accepted for API parity with the full component; this port has no toolbar. */
  readonly hideToolbar?: boolean
  /** Draw hairline row + column separators. Default `true`. */
  readonly separators?: boolean
}

const cx = (...parts: Array<string | false | undefined>) =>
  parts.filter(Boolean).join(' ')

export function Table<TData>({
  data,
  columns,
  estimateRowHeight = 24,
  emptyState,
  onRowClick,
  refreshing = false,
  footer,
  separators = true,
}: TableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data: data as Array<TData>,
    columns: columns as Array<ColumnDef<TData, unknown>>,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const rows = table.getRowModel().rows
  const headers = table.getHeaderGroups()[0]?.headers ?? []
  const isEmpty = rows.length === 0

  const bodyRef = useRef<HTMLDivElement | null>(null)
  const headerRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => bodyRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 12,
  })

  // Keep the header aligned with the body: sync horizontal scroll, and
  // mirror the body's vertical-scrollbar gutter onto the header.
  useEffect(() => {
    const body = bodyRef.current
    const header = headerRef.current
    if (!body || !header) return
    const onScroll = () => {
      header.scrollLeft = body.scrollLeft
    }
    body.addEventListener('scroll', onScroll)
    const ro = new ResizeObserver(() => {
      const gutter = body.offsetWidth - body.clientWidth
      header.style.setProperty('--scrollbar-gutter', `${gutter}px`)
    })
    ro.observe(body)
    return () => {
      body.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [])

  const defaultFooter = (
    <div className={styles.footer}>
      <span className={styles.footerLeft}>
        {rows.length.toLocaleString()} row{rows.length === 1 ? '' : 's'}
      </span>
      <span className={styles.footerRight}>
        {refreshing && (
          <span className={styles.refreshing}>
            <span className={styles.refreshDot} aria-hidden="true" />
            refreshing…
          </span>
        )}
      </span>
    </div>
  )

  const footerNode =
    typeof footer === 'function'
      ? footer({ rowCount: rows.length, refreshing })
      : (footer ?? defaultFooter)

  return (
    <div
      ref={frameRef}
      className={styles.frame}
      data-separators={separators ? 'true' : undefined}
    >
      <div ref={headerRef} className={styles.headerScroll}>
        <div className={styles.headerRow} role="row">
          {headers.map((header) => {
            const def = header.column.columnDef
            const colMeta: ColumnMeta | undefined = def.meta
            const sortable = header.column.getCanSort()
            const sortDir = header.column.getIsSorted()
            const size = header.getSize()
            return (
              <div
                key={header.id}
                role="columnheader"
                className={cx(
                  styles.headerCell,
                  sortable && styles.headerCellSortable,
                  colMeta?.align === 'right' && styles.headerCellAlignRight,
                )}
                style={{ width: size, minWidth: size, maxWidth: size }}
                onClick={
                  sortable ? header.column.getToggleSortingHandler() : undefined
                }
                aria-sort={
                  sortDir === 'asc'
                    ? 'ascending'
                    : sortDir === 'desc'
                      ? 'descending'
                      : undefined
                }
              >
                <span>{flexRender(def.header, header.getContext())}</span>
                {sortable && (
                  <span
                    className={cx(
                      styles.sortIcon,
                      sortDir && styles.sortIconActive,
                    )}
                    aria-hidden="true"
                  >
                    {sortDir === 'asc' ? (
                      <ChevronUp size={14} />
                    ) : sortDir === 'desc' ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronsUpDown size={14} />
                    )}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div
        ref={bodyRef}
        className={styles.bodyScroll}
        role="grid"
        aria-rowcount={rows.length}
      >
        {isEmpty ? (
          <div className={styles.empty}>{emptyState ?? 'No rows.'}</div>
        ) : (
          <div
            className={styles.bodyHolder}
            style={{ height: rowVirtualizer.getTotalSize() }}
            role="rowgroup"
          >
            {rowVirtualizer.getVirtualItems().map((vi) => {
              const row = rows[vi.index]
              if (!row) return null
              const clickable = !!onRowClick
              return (
                <div
                  key={row.id}
                  role="row"
                  aria-rowindex={vi.index + 1}
                  className={cx(styles.row, clickable && styles.rowClickable)}
                  style={{
                    transform: `translateY(${vi.start}px)`,
                    height: vi.size,
                  }}
                  onClick={
                    clickable ? () => onRowClick(row.original) : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => {
                    const colMeta: ColumnMeta | undefined =
                      cell.column.columnDef.meta
                    const size = cell.column.getSize()
                    return (
                      <div
                        key={cell.id}
                        role="cell"
                        className={cx(
                          styles.cell,
                          colMeta?.align === 'right' && styles.cellAlignRight,
                          colMeta?.mono && styles.cellMono,
                        )}
                        style={{ width: size, minWidth: size, maxWidth: size }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {footerNode}
    </div>
  )
}
