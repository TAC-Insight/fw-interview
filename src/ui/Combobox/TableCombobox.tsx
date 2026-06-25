/* eslint react-hooks/incompatible-library: "off" */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Popover } from '@base-ui/react/popover'
import { ChevronDown, ChevronUp, ChevronsUpDown, X } from 'lucide-react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import comboboxStyles from './Combobox.module.css'
import styles from './TableCombobox.module.css'

export interface TableComboboxColumn<TRow> {
  /** Stable id used for sort state and column keys. */
  readonly id: string
  readonly header: string
  /** Cell value used for display, filter match, and sort. Return an
   *  empty string for "no value" — renders as em-dash. */
  readonly accessor: (row: TRow) => string
  /** Fixed pixel width for this column. */
  readonly size: number
  /** Disable sorting for this column. Default: sortable. */
  readonly sortable?: false
}

export interface TableComboboxProps<TRow, V extends string | number> {
  readonly value: V | null
  readonly onChange: (next: V | null) => void
  readonly data: ReadonlyArray<TRow>
  readonly selectedRow?: TRow | null
  readonly columns: ReadonlyArray<TableComboboxColumn<TRow>>
  readonly getRowId: (row: TRow) => V
  /** Rendered inside the trigger button when something is selected. */
  readonly triggerLabel: (row: TRow) => ReactNode
  readonly placeholder?: string
  readonly searchPlaceholder?: string
  readonly emptyLabel?: string
  readonly disabled?: boolean
  /** Show the inline X clear affordance when there's a value.
   *  Defaults to true. */
  readonly clearable?: boolean
  /** Opt out of the default stretch-to-container trigger and use the
   *  legacy 160–320px toolbar-pill range instead. */
  readonly compact?: boolean
  readonly id?: string
  readonly triggerRef?: React.Ref<HTMLButtonElement>
  readonly loading?: boolean
  readonly onOpenChange?: (open: boolean) => void
  readonly onQueryChange?: (query: string) => void
}

/**
 * Single-select combobox whose panel is a proper sortable + virtualized
 * table. For pickers driven by a multi-column row (POS ship-to,
 * customer, product, …) the plain `<Combobox>` panel was reimplementing
 * column layout, sticky headers, and virtualization by hand on top of a
 * CSS grid — this is the version that uses TanStack Table for the
 * column model + sort + filter and TanStack Virtual for the rows, so
 * column widths come from `column.size` (not `ch`-count guesses) and
 * the header is a real sortable control instead of a label strip.
 *
 * Trigger styling is shared with `<Combobox>` (same `--control-*`
 * tokens) so a row of mixed pickers reads consistently.
 */
export function TableCombobox<TRow, V extends string | number>(
  props: TableComboboxProps<TRow, V>,
): ReactNode {
  'use no memo'

  const [open, setOpen] = useState(false)
  // Letter-key pressed on the closed trigger so the panel's search
  // input opens pre-seeded with it (matches <Combobox>).
  const [typeahead, setTypeahead] = useState('')
  const [query, setQuery] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  // useState (not useRef) so the virtualizer re-runs once the
  // listbox actually mounts — `useVirtualizer` reads
  // `getScrollElement` during render and a one-shot ref attaches
  // *after* the first commit, leaving the virtualizer stuck with
  // `getScrollElement(): null` and an empty visible-range forever.
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null)
  const onQueryChange = props.onQueryChange
  // Stable ids so the active row is announced via the input's
  // `aria-activedescendant` (the highlight is otherwise visual-only and
  // silent to screen readers). Mirrors ComboboxPanel.
  const listId = useId()
  const optionId = (index: number) => `${listId}-opt-${index}`

  const colDefs = useMemo<ReadonlyArray<ColumnDef<TRow>>>(
    () =>
      props.columns.map((c) => ({
        id: c.id,
        accessorFn: (row) => c.accessor(row),
        header: c.header,
        size: c.size,
        enableSorting: c.sortable !== false,
        cell: (info) => {
          const v = info.getValue() as string
          return v.length > 0 ? v : '—'
        },
      })),
    [props.columns],
  )

  // Lowercased search query so the custom filter doesn't lowercase
  // the same string on every row check.
  const queryLower = query.trim().toLowerCase()
  const manualFilter = props.onQueryChange !== undefined

  const table = useReactTable({
    data: props.data as TRow[],
    columns: colDefs as ColumnDef<TRow>[],
    state: { sorting, globalFilter: manualFilter ? '' : queryLower },
    onSortingChange: setSorting,
    getRowId: (row) => String(props.getRowId(row)),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualFiltering: manualFilter,
    // Default global filter is `includesString` which does the same
    // substring match we want; declaring it explicitly so the
    // intent is obvious and the table doesn't fall back to anything
    // weaker if the default changes upstream.
    globalFilterFn: 'includesString',
  })

  const rows = table.getRowModel().rows
  const totalWidth = useMemo(
    () => props.columns.reduce((sum, c) => sum + c.size, 0),
    [props.columns],
  )

  useEffect(() => {
    setActiveIndex((i) => {
      if (rows.length === 0) return 0
      if (i >= rows.length) return rows.length - 1
      return i
    })
  }, [rows.length])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => listEl,
    estimateSize: () => 32,
    overscan: 8,
  })

  useEffect(() => {
    if (!open || rows.length === 0) return
    virtualizer.scrollToIndex(activeIndex, { align: 'auto' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, open])

  // On open: seed search with the typeahead letter (if any) and
  // reset highlight. On close: clear search + typeahead so the next
  // open starts fresh. Sort state persists across opens — repeated
  // pickers often benefit from "sorted by city" sticking around.
  useEffect(() => {
    if (open) {
      setQuery(typeahead)
      setActiveIndex(0)
    } else {
      setQuery('')
      setTypeahead('')
    }
  }, [open, typeahead])

  useEffect(() => {
    if (!open) return
    onQueryChange?.(query)
  }, [open, query, onQueryChange])

  const commit = useCallback(
    (idx: number) => {
      const row = rows[idx]
      if (!row) return
      props.onChange(props.getRowId(row.original))
      setOpen(false)
    },
    [rows, props],
  )

  const onPanelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (rows.length > 0) setActiveIndex((i) => (i + 1) % rows.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (rows.length > 0) {
        setActiveIndex((i) => (i - 1 + rows.length) % rows.length)
      }
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      if (rows.length > 0) setActiveIndex(rows.length - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commit(activeIndex)
    }
  }

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (open) return
    if (e.key.length !== 1) return
    if (e.key === ' ') return
    if (e.ctrlKey || e.metaKey || e.altKey) return
    e.preventDefault()
    setTypeahead(e.key)
    setOpen(true)
  }

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setTypeahead('')
    props.onOpenChange?.(next)
  }

  const onClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    props.onChange(null)
  }

  const showClear =
    !props.disabled && props.clearable !== false && props.value !== null

  // The selected row's trigger label is looked up by id rather than
  // cached, so out-of-band data updates (e.g. an offline pending row
  // mutating) propagate to the trigger without extra plumbing.
  const { data: propsData, value: propsValue, getRowId: propsGetRowId } = props
  const selectedRow = useMemo(() => {
    if (propsValue === null) return null
    if (
      props.selectedRow !== undefined &&
      props.selectedRow !== null &&
      propsGetRowId(props.selectedRow) === propsValue
    ) {
      return props.selectedRow
    }
    for (const r of propsData) {
      if (propsGetRowId(r) === propsValue) return r
    }
    return null
  }, [propsData, propsValue, propsGetRowId, props.selectedRow])

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger
        ref={props.triggerRef}
        id={props.id}
        className={
          props.compact
            ? `${comboboxStyles.trigger} ${comboboxStyles.triggerCompact}`
            : comboboxStyles.trigger
        }
        data-open={open ? 'true' : undefined}
        disabled={props.disabled}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={comboboxStyles.triggerBody}>
          {selectedRow ? (
            <span className={comboboxStyles.value}>
              <span className={comboboxStyles.valueLabel}>
                {props.triggerLabel(selectedRow)}
              </span>
            </span>
          ) : (
            <span className={comboboxStyles.placeholder}>
              {props.placeholder ?? 'All'}
            </span>
          )}
        </span>
        {showClear && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear"
            className={comboboxStyles.clear}
            onClick={onClear}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <X size={12} />
          </span>
        )}
        <span className={comboboxStyles.caret} aria-hidden="true">
          <ChevronDown size={14} />
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={4} align="start">
          <Popover.Popup className={styles.popup}>
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={
                rows[activeIndex] ? optionId(activeIndex) : undefined
              }
              className={comboboxStyles.searchInput}
              placeholder={props.searchPlaceholder ?? 'Search…'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onPanelKeyDown}
              autoFocus
            />
            <div
              ref={setListEl}
              id={listId}
              role="listbox"
              className={styles.list}
            >
              <div className={styles.grid} style={{ width: `${totalWidth}px` }}>
                <div className={styles.headerRow}>
                  {table.getHeaderGroups()[0]?.headers.map((h) => {
                    const sortable = h.column.getCanSort()
                    const sortDir = h.column.getIsSorted()
                    return (
                      <button
                        key={h.id}
                        type="button"
                        className={styles.headerCell}
                        style={{ width: `${h.column.getSize()}px` }}
                        data-sortable={sortable ? 'true' : undefined}
                        onClick={
                          sortable ? () => h.column.toggleSorting() : undefined
                        }
                        // Don't steal focus from the search input.
                        onMouseDown={(e) => e.preventDefault()}
                        disabled={!sortable}
                      >
                        <span className={styles.headerLabel}>
                          {flexRender(
                            h.column.columnDef.header,
                            h.getContext(),
                          )}
                        </span>
                        {sortable && (
                          <span className={styles.sortIcon}>
                            {sortDir === 'asc' ? (
                              <ChevronUp size={11} />
                            ) : sortDir === 'desc' ? (
                              <ChevronDown size={11} />
                            ) : (
                              <ChevronsUpDown size={11} />
                            )}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                {rows.length === 0 ? (
                  <div className={styles.empty}>
                    {props.loading
                      ? 'Loading...'
                      : (props.emptyLabel ?? 'No matches')}
                  </div>
                ) : (
                  <div
                    style={{
                      height: `${virtualizer.getTotalSize()}px`,
                      position: 'relative',
                      width: `${totalWidth}px`,
                    }}
                  >
                    {virtualizer.getVirtualItems().map((vr) => {
                      const row = rows[vr.index]!
                      const rowId = props.getRowId(row.original)
                      const selected = rowId === props.value
                      const active = vr.index === activeIndex
                      return (
                        <div
                          key={row.id}
                          id={optionId(vr.index)}
                          ref={virtualizer.measureElement}
                          data-index={vr.index}
                          role="option"
                          aria-selected={selected}
                          data-active={active ? 'true' : undefined}
                          data-checked={selected ? 'true' : undefined}
                          className={styles.row}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: `${totalWidth}px`,
                            transform: `translateY(${vr.start}px)`,
                          }}
                          onMouseEnter={() => setActiveIndex(vr.index)}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => commit(vr.index)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <div
                              key={cell.id}
                              className={styles.cell}
                              style={{ width: `${cell.column.getSize()}px` }}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
