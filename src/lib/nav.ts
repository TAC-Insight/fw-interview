/** Primary navigation items — mirrors fw-unified's LeftNav. */

import {
  ClipboardList,
  FileCog,
  Home,
  Receipt,
  Truck,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  readonly label: string
  readonly to: string
  readonly icon: LucideIcon
}

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'Tickets', to: '/tickets', icon: Receipt },
  { label: 'Sales', to: '/sales', icon: ClipboardList },
  { label: 'Fleet', to: '/fleet', icon: Truck },
  { label: 'Customers', to: '/customers', icon: Users },
  { label: 'Admin', to: '/admin', icon: FileCog },
]
