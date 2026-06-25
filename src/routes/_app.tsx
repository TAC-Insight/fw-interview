import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { AppLayout } from '#/shell/AppLayout'
import { readApiKey } from '#/lib/auth'

/**
 * Authenticated layout. Every page except `/login` lives under this subtree
 * and is gated by the synchronous API-key check below — no key, no shell.
 */
export const Route = createFileRoute('/_app')({
  component: AppRoot,
  beforeLoad: ({ location }) => {
    if (!readApiKey()) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
})

function AppRoot() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}
