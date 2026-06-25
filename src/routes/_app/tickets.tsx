import { createFileRoute } from '@tanstack/react-router'
import { Receipt } from 'lucide-react'
import { EmptyState } from '#/ui/EmptyState'

export const Route = createFileRoute('/_app/tickets')({ component: Tickets })

function Tickets() {
  return (
    <EmptyState
      icon={Receipt}
      title="Tickets"
      description="Coming soon. Scale tickets will be listed and managed here."
    />
  )
}
