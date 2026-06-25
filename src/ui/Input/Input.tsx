import type { InputHTMLAttributes, ReactNode, Ref } from 'react'
import { useId } from 'react'
import { cx } from '#/lib/cx'
import styles from './Input.module.css'

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'children'
> {
  ref?: Ref<HTMLInputElement>
  label?: ReactNode
  /** Inline error message rendered below the input; also flips the border red. */
  error?: ReactNode
  /** Optional helper text shown below the field when there's no error. */
  hint?: ReactNode
}

export function Input({
  ref,
  label,
  error,
  hint,
  id,
  className,
  ...rest
}: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined

  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cx(styles.input, className)}
        data-invalid={error ? 'true' : undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {error ? (
        <span id={`${inputId}-error`} className={styles.errorText}>
          {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className={styles.hint}>
          {hint}
        </span>
      ) : null}
    </div>
  )
}
