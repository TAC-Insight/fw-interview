import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MONTH_NAMES, WEEKDAYS, getMonthGrid, toDateStr } from './dates'
import styles from './DateRangePicker.module.css'

/** A range to highlight on the calendar.
 *
 *  Used for both the DateRangePicker (true ranges) and the single-date
 *  DatePicker (where `from === to` collapses to a single highlighted
 *  day). Endpoint cells get the solid `dayStart` / `dayEnd` fill; cells
 *  strictly between get the soft `dayInRange` fill. */
export interface CalendarRange {
  readonly from: string
  readonly to: string
}

const cx = (
  ...parts: ReadonlyArray<string | false | null | undefined>
): string => parts.filter(Boolean).join(' ')

export interface CalendarMonthProps {
  readonly year: number
  readonly month: number
  /** When undefined, no previous-month arrow renders (a spacer keeps
   *  the header aligned). The range picker uses this on its right
   *  month so only its left month exposes "prev." */
  readonly onPrev?: () => void
  /** Symmetric to `onPrev` for the right side. The DatePicker passes
   *  both so its single month is navigable in either direction. */
  readonly onNext?: () => void
  readonly range: CalendarRange | null
  readonly todayStr: string
  readonly onDayClick: (dateStr: string) => void
  /** Only set when the parent is mid-selection. Drives the hover
   *  preview that fills the in-between days while the user moves the
   *  pointer toward their end date. */
  readonly onDayHover?: (dateStr: string | null) => void
}

/** Headed month grid: prev/title/next bar, weekday row, day cells.
 *
 *  Pure presentation — the parent owns the selection state and decides
 *  what `range` to highlight. Used by both DateRangePicker (two months
 *  side-by-side) and DatePicker (a single month). */
export function CalendarMonth({
  year,
  month,
  onPrev,
  onNext,
  range,
  todayStr,
  onDayClick,
  onDayHover,
}: CalendarMonthProps) {
  const grid = useMemo(() => getMonthGrid(year, month), [year, month])
  return (
    <div className={styles.month}>
      <div className={styles.monthHeader}>
        {onPrev ? (
          <button
            type="button"
            className={styles.monthNav}
            onClick={onPrev}
            aria-label="Previous month"
          >
            <ChevronLeft size={14} />
          </button>
        ) : (
          <span className={styles.monthNavSpacer} />
        )}
        <span className={styles.monthTitle}>
          {MONTH_NAMES[month]} {year}
        </span>
        {onNext ? (
          <button
            type="button"
            className={styles.monthNav}
            onClick={onNext}
            aria-label="Next month"
          >
            <ChevronRight size={14} />
          </button>
        ) : (
          <span className={styles.monthNavSpacer} />
        )}
      </div>
      <div className={styles.weekdays}>
        {WEEKDAYS.map((d) => (
          <span key={d} className={styles.weekday}>
            {d}
          </span>
        ))}
      </div>
      <div className={styles.days} onMouseLeave={() => onDayHover?.(null)}>
        {grid.map((day, i) => {
          if (day === null) {
            return <span key={i} className={styles.dayEmpty} />
          }
          const dateStr = toDateStr(year, month, day)
          const isToday = dateStr === todayStr
          const isStart = range?.from === dateStr
          const isEnd = range?.to === dateStr
          const isInRange =
            !!range && dateStr > range.from && dateStr < range.to
          return (
            <button
              key={i}
              type="button"
              className={cx(
                styles.day,
                isToday && styles.dayToday,
                isStart && styles.dayStart,
                isEnd && styles.dayEnd,
                isInRange && styles.dayInRange,
              )}
              onClick={() => onDayClick(dateStr)}
              onMouseEnter={() => onDayHover?.(dateStr)}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
