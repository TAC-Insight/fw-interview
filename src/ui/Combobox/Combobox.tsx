/* eslint react-hooks/refs: "off" */
// `triggerRef` is a forwarded DOM ref prop, not a ref read used for rendering.
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Popover } from '@base-ui/react/popover'
import { ChevronDown, X } from 'lucide-react'
import { ComboboxPanel } from './ComboboxPanel'
import type { ComboboxOption } from './ComboboxPanel'
import styles from './Combobox.module.css'

export type { ComboboxOption } from './ComboboxPanel'

interface BaseProps<V> {
  readonly options: ReadonlyArray<ComboboxOption<V>>
  readonly placeholder?: string
  readonly searchPlaceholder?: string
  readonly disabled?: boolean
  /** Optional fixed left-side affordance inside the trigger (icon). */
  readonly leadingIcon?: ReactNode
  /** Show the inline X clear button when there's a value. Defaults to
   *  true. Set false for controls where "no value" isn't valid — e.g.
   *  the tenant switcher, where the user must always be in *some*
   *  tenant. */
  readonly clearable?: boolean
  /** Imperative ref to the trigger button — surfaced so callers can
   *  programmatically focus, scroll into view, etc. */
  readonly triggerRef?: React.Ref<HTMLButtonElement>
  /** Opt out of the default stretch-to-container behavior and use the
   *  legacy 160–320px toolbar-pill range instead. Useful when the
   *  combobox lives in a freeform toolbar where filling the row would
   *  swallow neighboring controls (rather than a form cell whose
   *  width is already constrained by the layout). */
  readonly compact?: boolean
  /** Forwarded to the trigger button so a `<label htmlFor={id}>`
   *  upstream can focus the combobox, and so validation flows that
   *  `document.getElementById(id).focus()` still land on the right
   *  control. */
  readonly id?: string
  readonly loading?: boolean
  readonly onQueryChange?: (query: string) => void
  /** Fires whenever the popup opens or closes. Used by call sites
   *  that lazy-load their option list on first open — flip an
   *  `enabled` flag to true on the first `true` callback, leave it
   *  true thereafter. */
  readonly onOpenChange?: (open: boolean) => void
}

export interface ComboboxProps<V> extends BaseProps<V> {
  readonly multiple?: false
  readonly value: V | null
  readonly onChange: (next: V | null) => void
}

export interface MultiComboboxProps<V> extends BaseProps<V> {
  readonly multiple: true
  readonly value: ReadonlyArray<V>
  readonly onChange: (next: ReadonlyArray<V>) => void
  /** Label rendered when no items are selected (default: "All"). */
  readonly emptyLabel?: string
}

type Props<V> = ComboboxProps<V> | MultiComboboxProps<V>

/**
 * Combined single + multi combobox trigger. The trigger is styled as a
 * "compact control" — matches the DateRangePicker, tickets filter
 * chips, and any other toolbar input across the app. The popup body
 * is the shared `ComboboxPanel` (search + list + keyboard nav).
 */
export function Combobox<V extends string | number>(
  props: ComboboxProps<V>,
): ReactNode
export function Combobox<V extends string | number>(
  props: MultiComboboxProps<V>,
): ReactNode
export function Combobox<V extends string | number>(
  props: Props<V>,
): ReactNode {
  const options = props.options
  const placeholder = props.placeholder
  const searchPlaceholder = props.searchPlaceholder
  const disabled = props.disabled
  const leadingIcon = props.leadingIcon
  const clearable = props.clearable
  const triggerRef = props.triggerRef
  const compact = props.compact
  const id = props.id
  const loading = props.loading
  const onQueryChange = props.onQueryChange
  const onOpenChangeProp = props.onOpenChange
  const [open, setOpen] = useState(false)
  // Letter-key pressed on the trigger before the popup is open; we
  // pre-seed the panel's search input with it so the operator can
  // tab onto the field and start typing without an explicit open
  // click. Reset on close so the next open starts blank.
  const [typeahead, setTypeahead] = useState('')
  const multi = props.multiple === true

  const optionByValue = useMemo(() => {
    const m = new Map<V, ComboboxOption<V>>()
    for (const o of options) m.set(o.value, o)
    return m
  }, [options])

  const onClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (props.multiple === true) props.onChange([])
    else props.onChange(null)
  }

  const removeChip = (val: V, e: React.MouseEvent) => {
    e.stopPropagation()
    if (props.multiple === true) {
      props.onChange(props.value.filter((v) => v !== val))
    }
  }

  const renderTrigger = (): ReactNode => {
    if (multi) {
      if (props.value.length === 0) {
        return (
          <span className={styles.placeholder}>
            {props.emptyLabel ?? placeholder ?? 'All'}
          </span>
        )
      }
      const head = props.value.slice(0, 2)
      const rest = props.value.length - head.length
      return (
        <span className={styles.chips}>
          {head.map((v) => {
            const opt = optionByValue.get(v)
            return (
              <span key={String(v)} className={styles.chip}>
                <span className={styles.chipLabel}>
                  {opt?.label ?? `#${String(v)}`}
                </span>
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label="Remove"
                  className={styles.chipRemove}
                  onClick={(e) => removeChip(v, e)}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <X size={11} />
                </span>
              </span>
            )
          })}
          {rest > 0 && <span className={styles.chipMore}>+{rest} more</span>}
        </span>
      )
    }
    if (props.value === null) {
      return <span className={styles.placeholder}>{placeholder ?? 'All'}</span>
    }
    // A selected value with no matching option means the options
    // haven't loaded yet, or the selection is stale (e.g. an old
    // localStorage apiKey after a tenant switch). Don't surface the
    // raw value as a "label" — a bare UUID or numeric ID is worse
    // than the placeholder. The caller's loader is responsible for
    // either reconciling the selection or showing it as soon as the
    // matching row arrives.
    const opt = optionByValue.get(props.value)
    if (!opt) {
      return <span className={styles.placeholder}>{placeholder ?? 'All'}</span>
    }
    // Trigger is a tight memo of the current pick — primary + a
    // bare sublabel value. The column-label prefix shown in the
    // dropdown header isn't repeated here: it bloats the trigger,
    // truncates fast at narrow widths, and would read redundantly
    // alongside the surrounding form field label.
    return (
      <span className={styles.value}>
        <span className={styles.valueLabel}>{opt.label}</span>
        {opt.sublabel && (
          <span className={styles.valueSublabel}> — {opt.sublabel}</span>
        )}
      </span>
    )
  }

  const showClear =
    !disabled &&
    clearable !== false &&
    (props.multiple === true ? props.value.length > 0 : props.value !== null)

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    // Already open? Let the panel's own input own the keystrokes.
    if (open) return
    // Skip keyboard nav, modifiers, and IME composition. Single-char
    // `e.key` covers letters, digits, and most symbols across layouts;
    // the Space sentinel keeps the native button "open on space"
    // behaviour from being hijacked as a seed.
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
    onOpenChangeProp?.(next)
  }

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger
        ref={triggerRef}
        id={id}
        className={
          compact
            ? `${styles.trigger} ${styles.triggerCompact}`
            : styles.trigger
        }
        data-open={open ? 'true' : undefined}
        disabled={disabled}
        onKeyDown={onTriggerKeyDown}
      >
        {leadingIcon && (
          <span className={styles.leading} aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <span className={styles.triggerBody}>{renderTrigger()}</span>
        {showClear && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear"
            className={styles.clear}
            onClick={onClear}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <X size={12} />
          </span>
        )}
        <span className={styles.caret} aria-hidden="true">
          <ChevronDown size={14} />
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={4} align="start">
          <Popover.Popup className={styles.popup}>
            {/* `key` resets the panel's internal state (query, active
             *  row, scroll position) on every open. Without it, Base
             *  UI keeps the panel mounted across the close transition
             *  and the next open inherits stale state — so a fresh
             *  typeahead seed never lands. */}
            {multi ? (
              <ComboboxPanel
                key={`${open ? 'open' : 'closed'}:${typeahead}`}
                multiple
                options={options}
                value={props.value}
                onChange={props.onChange}
                searchPlaceholder={searchPlaceholder}
                initialQuery={typeahead}
                loading={loading}
                onQueryChange={onQueryChange}
              />
            ) : (
              <ComboboxPanel
                key={`${open ? 'open' : 'closed'}:${typeahead}`}
                options={options}
                value={props.value}
                onChange={props.onChange}
                searchPlaceholder={searchPlaceholder}
                onCommit={() => onOpenChange(false)}
                initialQuery={typeahead}
                loading={loading}
                onQueryChange={onQueryChange}
              />
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
