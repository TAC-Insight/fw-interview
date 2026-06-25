import { useEffect, useRef, useState } from 'react'
import { formatDateForInput } from './dates'
import styles from './DateRangePicker.module.css'

const cx = (
  ...parts: ReadonlyArray<string | false | null | undefined>
): string => parts.filter(Boolean).join(' ')

export interface ManualDateInputProps {
  /** Compact eyebrow ("From" / "To" in the range picker, "Date" for
   *  the single picker). Falsy → no label slot rendered. */
  readonly label?: string
  /** Canonical `YYYY-MM-DD` or '' if unset. Displayed as `MM/DD/YYYY`. */
  readonly value: string
  /** Return `false` if the raw text didn't parse — we'll mark the
   *  input invalid and leave the typed text in place so the user can
   *  fix it without retyping. */
  readonly onCommit: (raw: string) => boolean
}

/** Typeable `MM/DD/YYYY` input that commits on Enter or blur.
 *
 *  External value changes (calendar pick, preset click, etc.) re-sync
 *  the display unless the user is actively editing. Escape reverts. */
export function ManualDateInput({
  label,
  value,
  onCommit,
}: ManualDateInputProps) {
  const [text, setText] = useState(() => formatDateForInput(value))
  const [invalid, setInvalid] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Re-sync when the external value changes — but only when the field
  // isn't being edited, so a parent re-render mid-type doesn't clobber
  // the user's in-progress input.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setText(formatDateForInput(value))
      setInvalid(false)
    }
  }, [value])

  const commit = () => {
    if (text === formatDateForInput(value)) {
      setInvalid(false)
      return
    }
    const ok = onCommit(text)
    if (!ok) {
      setInvalid(true)
      return
    }
    setInvalid(false)
  }

  return (
    <label className={styles.manualField}>
      {label ? <span className={styles.manualLabel}>{label}</span> : null}
      <input
        ref={inputRef}
        className={cx(styles.manualInput, invalid && styles.manualInputInvalid)}
        value={text}
        placeholder="MM/DD/YYYY"
        spellCheck={false}
        autoComplete="off"
        inputMode="numeric"
        onChange={(e) => {
          setText(e.target.value)
          if (invalid) setInvalid(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          } else if (e.key === 'Escape') {
            setText(formatDateForInput(value))
            setInvalid(false)
            inputRef.current?.blur()
          }
        }}
        onBlur={commit}
      />
    </label>
  )
}
