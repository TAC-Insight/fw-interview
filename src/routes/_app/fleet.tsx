import { createFileRoute } from '@tanstack/react-router'
import { Truck } from 'lucide-react'
import { EmptyState } from '#/ui/EmptyState'

export const Route = createFileRoute('/_app/fleet')({ component: Fleet })

function Fleet() {
  return (
    <EmptyState
      icon={Truck}
      title="Fleet"
      description="Coming soon. Trucks, haulers, and drivers will live here."
    />
  )
}
