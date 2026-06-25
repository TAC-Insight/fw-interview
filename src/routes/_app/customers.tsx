import { createFileRoute } from '@tanstack/react-router'
import { Users } from 'lucide-react'
import { EmptyState } from '#/ui/EmptyState'

export const Route = createFileRoute('/_app/customers')({
  component: Customers,
})

function Customers() {
  return (
    <EmptyState
      icon={Users}
      title="Customers"
      description="Coming soon. Customer accounts and contacts will live here."
    />
  )
}
