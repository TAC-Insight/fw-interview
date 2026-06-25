import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Button } from '#/ui/Button'
import { Input } from '#/ui/Input'
import { readApiKey, writeApiKey } from '#/lib/auth'
import styles from './login.module.css'

interface LoginSearch {
  readonly redirect?: string
}

/** Keep redirects same-origin and never bounce back to /login. */
function safeRedirect(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return '/'
  try {
    const url = new URL(value, window.location.origin)
    if (url.origin !== window.location.origin) return '/'
    if (url.pathname === '/login') return '/'
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/'
  }
}

export const Route = createFileRoute('/login')({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>): LoginSearch =>
    typeof search.redirect === 'string' ? { redirect: search.redirect } : {},
  beforeLoad: ({ search }) => {
    // Already signed in — skip the login screen.
    if (readApiKey()) {
      throw redirect({ to: safeRedirect(search.redirect) })
    }
  },
})

function LoginPage() {
  const search = Route.useSearch()
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = key.trim()
    if (!trimmed) {
      setError('Enter your API key to continue.')
      return
    }
    writeApiKey(trimmed)
    // Full navigation so the authenticated route's guard re-evaluates
    // cleanly against the freshly stored key.
    window.location.href = safeRedirect(search.redirect)
  }

  return (
    <div className={styles.page}>
      <div className={styles.bgGradient} aria-hidden="true" />
      <form className={styles.card} onSubmit={onSubmit}>
        <header className={styles.header}>
          <img
            className={styles.logo}
            src="/fwlogo.svg"
            alt="Fastweigh"
            width={160}
            height={48}
          />
        </header>

        <div className={styles.intro}>
          <h1 className={styles.heading}>Sign in</h1>
          <p className={styles.sub}>
            Enter your API key to access the console.
          </p>
        </div>

        <Input
          name="apiKey"
          type="password"
          label="API key"
          placeholder="fw_live_…"
          autoComplete="off"
          autoFocus
          value={key}
          error={error ?? undefined}
          hint="Stored locally in your browser and sent as a bearer token."
          onChange={(e) => {
            setKey(e.currentTarget.value)
            if (error) setError(null)
          }}
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={!key.trim()}
        >
          Continue
        </Button>
      </form>

      <p className={styles.disclaimer}>
        Use of this system is restricted to authorized users. Activity may be
        monitored and recorded.
      </p>
    </div>
  )
}
