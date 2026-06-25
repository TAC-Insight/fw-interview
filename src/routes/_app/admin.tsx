import { createFileRoute } from '@tanstack/react-router'
import { FileCog } from 'lucide-react'
import { EmptyState } from '#/ui/EmptyState'

export const Route = createFileRoute('/_app/admin')({ component: Admin })

function Admin() {
  return (
    <EmptyState
      icon={FileCog}
      title="Admin"
      description="Coming soon. Users, roles, and configuration will live here."
    />
  )
}
