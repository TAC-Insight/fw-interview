import { createFileRoute } from '@tanstack/react-router'
import { ClipboardList } from 'lucide-react'
import { EmptyState } from '#/ui/EmptyState'

export const Route = createFileRoute('/_app/sales')({ component: Sales })

function Sales() {
  return (
    <EmptyState
      icon={ClipboardList}
      title="Sales"
      description="Coming soon. Orders and quotes will live here."
    />
  )
}
