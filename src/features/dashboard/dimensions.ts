/**
 * Client-side breakdown aggregation. fw-unified does this in SQL against
 * the local synced DB; here we group the fetched ticket set in memory so
 * the same five dimension tabs work off one network query.
 */

import type { DashboardTicket } from '#/lib/graphql'

export type DimensionKey =
  | 'product'
  | 'customer'
  | 'order'
  | 'truck'
  | 'location'

export interface DimensionSpec {
  readonly label: string
  readonly idHeader: string
  readonly nameHeader: string
  readonly keyOf: (t: DashboardTicket) => number | null
  readonly idOf: (t: DashboardTicket) => string | null
  readonly nameOf: (t: DashboardTicket) => string | null
}

export const DIMENSION_ORDER: ReadonlyArray<DimensionKey> = [
  'product',
  'customer',
  'order',
  'truck',
  'location',
]

export const DASHBOARD_DIMENSIONS: Record<DimensionKey, DimensionSpec> = {
  product: {
    label: 'Products',
    idHeader: 'ID',
    nameHeader: 'Description',
    keyOf: (t) => t.productKey,
    idOf: (t) => t.productID,
    nameOf: (t) => t.productDescription,
  },
  customer: {
    label: 'Customers',
    idHeader: 'ID',
    nameHeader: 'Name',
    keyOf: (t) => t.customerKey,
    idOf: (t) => t.customerID,
    nameOf: (t) => t.customerName,
  },
  order: {
    label: 'Orders',
    idHeader: 'Number',
    nameHeader: 'Description',
    keyOf: (t) => t.orderKey,
    idOf: (t) => (t.orderNumber == null ? null : String(t.orderNumber)),
    nameOf: (t) => t.orderDescription,
  },
  truck: {
    label: 'Trucks',
    idHeader: 'ID',
    nameHeader: 'Hauler',
    keyOf: (t) => t.truckKey,
    idOf: (t) => t.truckID,
    nameOf: (t) => t.haulerLabel,
  },
  location: {
    label: 'Locations',
    idHeader: 'Name',
    nameHeader: 'Cost Center',
    keyOf: (t) => t.locationKey,
    idOf: (t) => t.locationName,
    nameOf: (t) => t.locationCostCenter,
  },
}

export interface BreakdownRow {
  key: number
  id: string | null
  name: string | null
  loads: number
  units: number
}

/** Group tickets by the dimension key, summing loads (count) and units
 *  (net weight). Ranked by units, descending. */
export function computeBreakdown(
  tickets: ReadonlyArray<DashboardTicket>,
  dim: DimensionKey,
): ReadonlyArray<BreakdownRow> {
  const spec = DASHBOARD_DIMENSIONS[dim]
  const byKey = new Map<number, BreakdownRow>()
  for (const t of tickets) {
    const key = spec.keyOf(t)
    if (key == null) continue
    let row = byKey.get(key)
    if (!row) {
      row = { key, id: spec.idOf(t), name: spec.nameOf(t), loads: 0, units: 0 }
      byKey.set(key, row)
    }
    row.loads += 1
    row.units += t.netWeight
  }
  return [...byKey.values()].sort((a, b) => b.units - a.units)
}
