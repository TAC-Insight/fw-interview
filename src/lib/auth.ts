/**
 * API-key auth.
 *
 * Auth here is a single API key the user pastes on the login screen. We
 * keep it in localStorage so it survives reloads and — importantly — can be
 * read *synchronously* from a route guard (`beforeLoad`) without waiting on
 * an effect. The GraphQL client (lib/graphql.ts) sends it as a bearer token.
 *
 * This is deliberately simple: no expiry, no refresh, no encryption. The
 * key is namespaced so it doesn't collide with other localhost apps.
 */

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'fw-interview.apiKey'

/** Read the stored API key, or null if the user hasn't signed in. */
export function readApiKey(): string | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value && value.length > 0 ? value : null
  } catch {
    // localStorage can throw in private-mode / sandboxed contexts.
    return null
  }
}

export function writeApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key.trim())
  } catch {
    /* ignore — see readApiKey */
  }
  notify()
}

export function clearApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  notify()
}

/* ---- change notification (same-tab + cross-tab) ---------------------- */

const listeners = new Set<() => void>()

function notify(): void {
  for (const fn of listeners) fn()
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) fn()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * Reactive read of the API key for components (e.g. the top-bar account
 * menu). Re-renders when the key is written or cleared in this tab or any
 * other.
 */
export function useApiKey(): string | null {
  return useSyncExternalStore(subscribe, readApiKey, readApiKey)
}
