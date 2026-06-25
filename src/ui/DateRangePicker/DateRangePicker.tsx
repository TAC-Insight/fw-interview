import { useMemo, useState } from 'react'
import { Popover } from '@base-ui/react/popover'
import { Calendar, ChevronDown } from 'lucide-react'
import {
  ALL_DATE_PRESETS,
  DATE_PRESET_LABELS,
  addMonths,
  formatRange,
  getTodayStr,
  parseDateInput,
  resolveDatePreset,
} from './dates'
import type { DatePreset } from './dates'
import { CalendarMonth } from './CalendarMonth'
import { ManualDateInput } from './ManualDateInput'
import styles from './DateRangePicker.module.css'

export interface DateRange {
  readonly from: string
  readonly to: string
}

export interface DateRangePickerProps {
  readonly value: DateRange
  readonly onChange: (next: DateRange, preset?: DatePreset) => void
  readonly placeholder?: string
}

const cx = (
  ...parts: ReadonlyArray<string | false | null | undefined>
): string => parts.filter(Boolean).join(' ')

/**
 * Range date picker with preset chips on the left and a two-month
 * calendar on the right. Built on Base UI Popover for the outside-click
 * + escape + focus management.
 *
 * The trigger button shows the active preset label (if any matches the
 * current range exactly) or the formatted range like "Feb 13 – May 14".
 * Clicking a preset commits + closes immediately. Manual selection
 * needs two clicks (start, then end); the second click commits.
 */
export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Select dates',
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  // Two-phase manual selection: first click sets `anchor`, second
  // commits the range (smaller of the two = from).
  const [anchor, setAnchor] = useState<string | null>(null)
  const [hoverDate, setHoverDate] = useState<string | null>(null)
  const [chosenPreset, setChosenPreset] = useState<DatePreset | null>(null)
  const [todayStr, setTodayStr] = useState(getTodayStr)

  // Left calendar anchored to `value.from`'s month so opening the
  // picker drops the user where they last picked.
  const [base, setBase] = useState(() => {
    if (value.from) {
      const parts = value.from.split('-').map(Number) as [
        number,
        number,
        number,
      ]
      return { year: parts[0], month: parts[1] - 1 }
    }
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const right = useMemo(() => addMonths(base.year, base.month, 1), [base])

  const resolvedPresets = useMemo(() => {
    const map: Partial<Record<DatePreset, DateRange>> = {}
    for (const p of ALL_DATE_PRESETS) map[p] = resolveDatePreset(p, todayStr)
    return map as Record<DatePreset, DateRange>
  }, [todayStr])

  // Active preset — explicit choice wins as long as it still matches.
  // Otherwise scan in declared order so overlapping presets (e.g.
  // Today/WTD on Mondays) pick the most specific one.
  const activePreset = useMemo<DatePreset | null>(() => {
    if (
      chosenPreset &&
      resolvedPresets[chosenPreset].from === value.from &&
      resolvedPresets[chosenPreset].to === value.to
    ) {
      return chosenPreset
    }
    for (const p of ALL_DATE_PRESETS) {
      const r = resolvedPresets[p]
      if (r.from === value.from && r.to === value.to) return p
    }
    return null
  }, [value, resolvedPresets, chosenPreset])

  // Range to highlight on the calendar — uses the hover-preview while
  // the user is mid-selection.
  const displayRange = useMemo<DateRange | null>(() => {
    if (anchor && hoverDate) {
      return anchor <= hoverDate
        ? { from: anchor, to: hoverDate }
        : { from: hoverDate, to: anchor }
    }
    if (anchor) return { from: anchor, to: anchor }
    return value
  }, [anchor, hoverDate, value])

  const triggerText = useMemo(() => {
    if (activePreset) return DATE_PRESET_LABELS[activePreset]
    if (value.from && value.to) return formatRange(value.from, value.to)
    return null
  }, [activePreset, value])

  const reset = () => {
    setAnchor(null)
    setHoverDate(null)
  }

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
    if (next) setTodayStr(getTodayStr())
    if (next && value.from) {
      const parts = value.from.split('-').map(Number) as [
        number,
        number,
        number,
      ]
      setBase({ year: parts[0], month: parts[1] - 1 })
    }
  }

  const onPresetClick = (preset: DatePreset) => {
    setChosenPreset(preset)
    const range = resolvedPresets[preset]
    onChange(range, preset)
    onOpenChange(false)
  }

  const onDayClick = (dateStr: string) => {
    if (anchor === null) {
      setAnchor(dateStr)
      return
    }
    const from = anchor <= dateStr ? anchor : dateStr
    const to = anchor <= dateStr ? dateStr : anchor
    setChosenPreset(null)
    onChange({ from, to })
    onOpenChange(false)
  }

  // Manual entry — commit on Enter/blur. Editing "from" past "to"
  // (or vice versa) swaps them so the order is always valid. The
  // visible calendar jumps to the committed month so the user can
  // see what they typed.
  const commitManual = (side: 'from' | 'to', raw: string): boolean => {
    const parsed = parseDateInput(raw)
    if (!parsed) return false
    const next: DateRange =
      side === 'from'
        ? parsed > value.to
          ? { from: parsed, to: parsed }
          : { from: parsed, to: value.to }
        : parsed < value.from
          ? { from: parsed, to: parsed }
          : { from: value.from, to: parsed }
    setChosenPreset(null)
    setAnchor(null)
    setHoverDate(null)
    const focus = side === 'from' ? next.from : next.to
    const parts = focus.split('-').map(Number) as [number, number, number]
    setBase({ year: parts[0], month: parts[1] - 1 })
    onChange(next)
    return true
  }

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger
        className={cx(styles.trigger, open && styles.triggerOpen)}
      >
        <Calendar size={13} className={styles.icon} />
        <span
          className={cx(
            styles.text,
            !triggerText && styles.placeholder,
            activePreset && styles.presetText,
          )}
        >
          {triggerText ?? placeholder}
        </span>
        <ChevronDown
          size={13}
          className={cx(styles.chevron, open && styles.chevronOpen)}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="end">
          <Popover.Popup className={styles.popup}>
            <div className={styles.layout}>
              <div className={styles.presets}>
                {ALL_DATE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={cx(
                      styles.presetItem,
                      activePreset === preset && !anchor && styles.presetActive,
                    )}
                    onClick={() => onPresetClick(preset)}
                  >
                    {DATE_PRESET_LABELS[preset]}
                  </button>
                ))}
              </div>
              <div className={styles.right}>
                <div className={styles.manualRow}>
                  <ManualDateInput
                    label="From"
                    value={value.from}
                    onCommit={(raw) => commitManual('from', raw)}
                  />
                  <span className={styles.manualSep} aria-hidden="true">
                    –
                  </span>
                  <ManualDateInput
                    label="To"
                    value={value.to}
                    onCommit={(raw) => commitManual('to', raw)}
                  />
                </div>
                <div className={styles.calendars}>
                  <CalendarMonth
                    year={base.year}
                    month={base.month}
                    onPrev={() =>
                      setBase((b) => addMonths(b.year, b.month, -1))
                    }
                    range={displayRange}
                    todayStr={todayStr}
                    onDayClick={onDayClick}
                    onDayHover={anchor ? setHoverDate : undefined}
                  />
                  <CalendarMonth
                    year={right.year}
                    month={right.month}
                    onNext={() => setBase((b) => addMonths(b.year, b.month, 1))}
                    range={displayRange}
                    todayStr={todayStr}
                    onDayClick={onDayClick}
                    onDayHover={anchor ? setHoverDate : undefined}
                  />
                </div>
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
