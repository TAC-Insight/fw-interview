/**
 * Tiny className joiner. Same helper the production app inlines in every component;
 * hoisted here so the UI wrappers can share it.
 *
 *   cx(styles.button, isActive && styles.active, className)
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
