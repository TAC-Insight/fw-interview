/* eslint react-hooks/incompatible-library: "off" */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import styles from './Combobox.module.css'

export interface ComboboxOption<V> {
  readonly value: V
  /** Primary visible label inside the dropdown row. Matched against
   *  the user's search query. */
  readonly label: string
  /** Optional secondary label (shown smaller under the primary). Also
   *  searched. */
  readonly sublabel?: string | null
  /** Extra "Label value" pairs shown as a tertiary line under the
   *  sublabel and included in the search haystack. Use this instead of
   *  a hidden-search field when an admin has opted a field into the
   *  search — operators need to see *why* a row matched so they don't
   *  guess at the dropdown. */
  readonly details?: ReadonlyArray<{
    readonly label: string
    readonly value: string
  }>
  /** Column-header text for the primary column. When set on the
   *  first visible option, the dropdown renders a sticky header above
   *  the rows whose primary slot reads this string (e.g. "Truck ID").
   *  Only the first option is consulted; treat as per-dropdown. */
  readonly primaryLabel?: string
  /** Column-header text for the sublabel column. Mirrors
   *  `primaryLabel` for the sublabel slot. */
  readonly sublabelLabel?: string
}

interface PanelBaseProps<V> {
  readonly options: ReadonlyArray<ComboboxOption<V>>
  readonly searchPlaceholder?: string
  /** Empty-state label when the list filters down to zero rows. */
  readonly emptyLabel?: string
  /** Auto-focus the search input on mount. Default true. */
  readonly autoFocus?: boolean
  /** Pre-seed the search input on mount. Used by Combobox to forward
   *  a keystroke that fired on the trigger before the popup opened. */
  readonly initialQuery?: string
  /** Override the default label + sublabel row layout. Lets call
   *  sites compose richer row contents (e.g., a multi-column truck
   *  row with hauler + tare in their own slots). The check-mark and
   *  hover/active styling stay panel-owned; only the inner content
   *  is replaced. */
  readonly renderRow?: (
    option: ComboboxOption<V>,
    state: { readonly checked: boolean; readonly active: boolean },
  ) => ReactNode
  readonly loading?: boolean
  readonly onQueryChange?: (query: string) => void
}

interface SinglePanelProps<V> extends PanelBaseProps<V> {
  readonly multiple?: false
  readonly value: V | null
  readonly onChange: (next: V | null) => void
  /** Called when a single-select option is picked (so the host can
   *  close its popover). Not fired for multi. */
  readonly onCommit?: () => void
}

interface MultiPanelProps<V> extends PanelBaseProps<V> {
  readonly multiple: true
  readonly value: ReadonlyArray<V>
  readonly onChange: (next: ReadonlyArray<V>) => void
}

export type ComboboxPanelProps<V> = SinglePanelProps<V> | MultiPanelProps<V>

/**
 * Search-input + filtered list with keyboard navigation. The shared
 * combobox body used both by the standalone `<Combobox>` trigger and
 * by the tickets toolbar filter chip's editor popover, so every
 * dropdown in the app reads identically.
 *
 * Pure presentation — the caller owns option loading and the selection
 * state. The panel manages: search query, active-row index, keyboard
 * nav (Arrow / Home / End / Enter / Backspace-to-remove for multi),
 * and scroll-into-view of the active row.
 */
export function ComboboxPanel<V extends string | number>(
  props: SinglePanelProps<V>,
): ReactNode
export function ComboboxPanel<V extends string | number>(
  props: MultiPanelProps<V>,
): ReactNode
export function ComboboxPanel<V extends string | number>(
  props: ComboboxPanelProps<V>,
): ReactNode {
  'use no memo'

  const [query, setQuery] = useState(props.initialQuery ?? '')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const onQueryChange = props.onQueryChange
  // Stable ids so the active option can be announced: the input points
  // at the listbox via `aria-controls` and at the highlighted row via
  // `aria-activedescendant`. Without these, arrow-key navigation moves
  // a purely visual highlight that screen readers never hear.
  const listId = useId()
  const optionId = (index: number) => `${listId}-opt-${index}`

  const selectedSet = useMemo(() => {
    if (props.multiple === true) return new Set<V>(props.value)
    const v = props.value
    return new Set<V>(v === null ? [] : [v])
  }, [props.multiple, props.value])

  const q = query.trim().toLowerCase()
  const manualFilter = props.onQueryChange !== undefined
  const filtered = useMemo(() => {
    if (manualFilter) return props.options
    if (!q) return props.options
    return props.options.filter((o) => {
      if (o.label.toLowerCase().includes(q)) return true
      if (o.sublabel && o.sublabel.toLowerCase().includes(q)) return true
      if (o.details) {
        for (const d of o.details) {
          if (d.value && d.value.toLowerCase().includes(q)) return true
        }
      }
      return false
    })
  }, [props.options, q, manualFilter])

  useEffect(() => {
    onQueryChange?.(query)
  }, [query, onQueryChange])

  // Column count for the grid layout — derived from the longest
  // `details` array so every row uses the same grid template and
  // labels line up vertically across rows.
  const detailCount = useMemo(() => {
    let max = 0
    for (const o of props.options) {
      if (o.details && o.details.length > max) max = o.details.length
    }
    return max
  }, [props.options])

  // grid-template-columns kept stable across rows so column edges
  // align — primary fixed-ish, sublabel a bit wider, details split
  // the remainder evenly.
  const labelsStyle = useMemo<React.CSSProperties>(
    () => ({
      gridTemplateColumns:
        detailCount > 0
          ? `minmax(60px, 0.8fr) minmax(100px, 1.2fr) ${`minmax(80px, 1.4fr) `.repeat(detailCount).trim()}`
          : `minmax(60px, max-content) 1fr`,
    }),
    [detailCount],
  )

  // Reset the highlight whenever the visible list changes; clamp so
  // the active row is always a valid index into `filtered`.
  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (!active) return
      setActiveIndex((i) => {
        if (filtered.length === 0) return 0
        if (i >= filtered.length) return filtered.length - 1
        return i
      })
    })
    return () => {
      active = false
    }
  }, [filtered.length])

  // Virtualize the list. Rows with a sublabel are taller than rows
  // without, so we let TanStack Virtual measure each rendered row
  // and adjust. The estimate is a sane default for the unmeasured
  // tail; `measureElement` on each row produces the real heights as
  // they scroll into view.
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 36,
    overscan: 6,
  })

  useEffect(() => {
    if (filtered.length === 0) return
    virtualizer.scrollToIndex(activeIndex, { align: 'auto' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex])

  const toggle = (val: V) => {
    if (props.multiple === true) {
      props.onChange(
        selectedSet.has(val)
          ? props.value.filter((v) => v !== val)
          : [...props.value, val],
      )
    } else {
      props.onChange(val)
      props.onCommit?.()
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (filtered.length > 0) {
        setActiveIndex((i) => (i + 1) % filtered.length)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (filtered.length > 0) {
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length)
      }
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      if (filtered.length > 0) setActiveIndex(filtered.length - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const opt = filtered[activeIndex]
      if (opt) toggle(opt.value)
    } else if (
      e.key === 'Backspace' &&
      query === '' &&
      props.multiple === true
    ) {
      if (props.value.length > 0) {
        e.preventDefault()
        props.onChange(props.value.slice(0, -1))
      }
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded="true"
        aria-controls={listId}
        aria-activedescendant={
          filtered[activeIndex] ? optionId(activeIndex) : undefined
        }
        className={styles.searchInput}
        placeholder={props.searchPlaceholder ?? 'Search…'}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        autoFocus={props.autoFocus !== false}
      />
      <div ref={listRef} id={listId} role="listbox" className={styles.list}>
        {/* Column header — labels move out of every row into a single
         *  sticky line so each row's cells use their full width for the
         *  value, not a "LABEL value" pair. Sticky so the headers stay
         *  visible while scrolling a long list. The primary +
         *  sublabel columns get headers from the first option's
         *  `primaryLabel` / `sublabelLabel`; detail headers come from
         *  each detail's own `label`. */}
        {filtered.length > 0 &&
          (filtered[0]?.primaryLabel ||
            filtered[0]?.sublabelLabel ||
            detailCount > 0) && (
            <div className={styles.headerRow}>
              <span className={styles.itemLabels} style={labelsStyle}>
                <span className={styles.headerLabel}>
                  {filtered[0]?.primaryLabel ?? ''}
                </span>
                <span className={styles.headerLabel}>
                  {filtered[0]?.sublabelLabel ?? ''}
                </span>
                {(filtered[0]?.details ?? []).map((d, i) => (
                  <span key={d.label + i} className={styles.headerLabel}>
                    {d.label}
                  </span>
                ))}
              </span>
              <span className={styles.itemCheck} aria-hidden="true" />
            </div>
          )}
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            {props.loading ? 'Loading...' : (props.emptyLabel ?? 'No matches')}
          </div>
        ) : (
          // Virtual-list inner container: sized to the total list
          // height so the scrollbar reflects the full count; rows are
          // absolutely positioned by the virtualizer's measured offset
          // so only the visible window of items mounts at any time.
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: 'relative',
              width: '100%',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const o = filtered[virtualRow.index]!
              const checked = selectedSet.has(o.value)
              const active = virtualRow.index === activeIndex
              return (
                <button
                  type="button"
                  key={String(o.value)}
                  id={optionId(virtualRow.index)}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  role="option"
                  aria-selected={checked}
                  data-checked={checked ? 'true' : undefined}
                  data-active={active ? 'true' : undefined}
                  className={styles.item}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onMouseEnter={() => setActiveIndex(virtualRow.index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggle(o.value)}
                  tabIndex={-1}
                >
                  {props.renderRow ? (
                    props.renderRow(o, { checked, active })
                  ) : (
                    <span className={styles.itemLabels} style={labelsStyle}>
                      <span className={styles.itemPrimary}>{o.label}</span>
                      <span className={styles.itemSecondary}>
                        {o.sublabel ?? ''}
                      </span>
                      {o.details &&
                        o.details.map((d, i) => (
                          <span
                            key={d.label + i}
                            className={styles.itemDetailValue}
                          >
                            {d.value || '—'}
                          </span>
                        ))}
                    </span>
                  )}
                  <span className={styles.itemCheck} aria-hidden={!checked}>
                    {checked && <Check size={12} />}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
