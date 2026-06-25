/**
 * Minimal GraphQL client.
 *
 * A single `fetch` that attaches the stored API key as a bearer token —
 * nothing more. There is NO caching, NO persistence, NO request dedup, and
 * NO sync here; that local-first layer is the candidate's task. The
 * Dashboard calls these helpers directly on mount.
 */

import { readApiKey } from './auth'

const ENDPOINT = 'https://graphql.fast-weigh.com/graphql'

export class GraphQLError extends Error {
  constructor(
    message: string,
    readonly errors?: ReadonlyArray<{ message: string }>,
  ) {
    super(message)
    this.name = 'GraphQLError'
  }
}

export async function graphql<TData, TVariables = Record<string, unknown>>(
  query: string,
  variables?: TVariables,
): Promise<TData> {
  const apiKey = readApiKey()

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    throw new GraphQLError(`Request failed: ${res.status} ${res.statusText}`)
  }

  const json = (await res.json()) as {
    data?: TData
    errors?: ReadonlyArray<{ message: string }>
  }

  if (json.errors?.length) {
    throw new GraphQLError(
      json.errors.map((e) => e.message).join('; '),
      json.errors,
    )
  }
  if (json.data == null) throw new GraphQLError('Response contained no data')
  return json.data
}

/* ---- Session identity (for the nav user row) ------------------------- */

export interface SessionInfo {
  readonly tenantID: string | null
  readonly fullname: string | null
  readonly writePermission: boolean
}

export async function fetchSessionInfo(): Promise<SessionInfo> {
  const data = await graphql<{ apiSessionInfo: SessionInfo | null }>(`
    {
      apiSessionInfo {
        tenantID
        fullname
        writePermission
      }
    }
  `)
  return (
    data.apiSessionInfo ?? {
      tenantID: null,
      fullname: null,
      writePermission: false,
    }
  )
}

/* ---- Filter option lists --------------------------------------------- */

export interface RegionRow {
  readonly regionKey: number
  readonly regionName: string
  readonly regionDescription: string | null
}

export interface LocationRow {
  readonly locationKey: number
  readonly locationName: string
  readonly locationDescription: string | null
  readonly regionKey: number
}

export async function fetchRegions(): Promise<ReadonlyArray<RegionRow>> {
  const data = await graphql<{ regions: ReadonlyArray<RegionRow> | null }>(`
    {
      regions {
        regionKey
        regionName
        regionDescription
      }
    }
  `)
  return (data.regions ?? [])
    .slice()
    .sort((a, b) => a.regionName.localeCompare(b.regionName))
}

export async function fetchLocations(): Promise<ReadonlyArray<LocationRow>> {
  const data = await graphql<{ locations: ReadonlyArray<LocationRow> | null }>(`
    {
      locations {
        locationKey
        locationName
        locationDescription
        regionKey
      }
    }
  `)
  return (data.locations ?? [])
    .slice()
    .sort((a, b) => a.locationName.localeCompare(b.locationName))
}

/* ---- Dashboard tickets ----------------------------------------------- */

export interface DashboardFilters {
  readonly fromDate: string
  readonly toDate: string
  readonly regionKeys: ReadonlyArray<number>
  readonly locationKeys: ReadonlyArray<number>
}

/** Flat ticket row — every dashboard panel reads from this one shape. */
export interface DashboardTicket {
  readonly ticketKey: number
  readonly ticketNumber: number
  readonly ticketDate: string
  readonly ticketDateTime: string | null
  readonly netWeight: number
  readonly grandTotal: number | null
  readonly regionKey: number | null
  readonly locationKey: number | null
  readonly locationName: string | null
  readonly locationCostCenter: string | null
  readonly orderKey: number | null
  readonly orderNumber: number | null
  readonly orderDescription: string | null
  readonly customerKey: number | null
  readonly customerID: string | null
  readonly customerName: string | null
  readonly truckKey: number | null
  readonly truckID: string | null
  readonly haulerLabel: string | null
  readonly productKey: number | null
  readonly productID: string | null
  readonly productDescription: string | null
}

interface RawTicket {
  ticketKey: number
  ticketNumber: number
  ticketDate: string
  ticketDateTime: string | null
  netWeight: number
  grandTotal: number | null
  regionKey: number | null
  customerKey: number | null
  productKey: number | null
  orderKey: number | null
  truckKey: number | null
  locationKey: number | null
  customer: { customerID: string | null; customerName: string | null } | null
  product: {
    productID: string | null
    productDescription: string | null
  } | null
  order: { orderNumber: number | null; description: string | null } | null
  truck: { truckID: string | null } | null
  hauler: { haulerID: string | null; haulerName: string | null } | null
  location: { locationName: string | null; costCenter: string | null } | null
}

const DASHBOARD_TICKETS = /* GraphQL */ `
  query DashboardTickets(
    $where: LoadTicketFilterInput
    $order: [LoadTicketSortInput!]
  ) {
    loadTickets(where: $where, order: $order) {
      ticketKey
      ticketNumber
      ticketDate
      ticketDateTime
      netWeight
      grandTotal
      regionKey
      customerKey
      productKey
      orderKey
      truckKey
      locationKey
      customer {
        customerID
        customerName
      }
      product {
        productID
        productDescription
      }
      order {
        orderNumber
        description
      }
      truck {
        truckID
      }
      hauler {
        haulerID
        haulerName
      }
      location {
        locationName
        costCenter
      }
    }
  }
`

function flatten(t: RawTicket): DashboardTicket {
  const haulerLabel = t.hauler
    ? [t.hauler.haulerID, t.hauler.haulerName].filter(Boolean).join(' - ') ||
      null
    : null
  return {
    ticketKey: Number(t.ticketKey),
    ticketNumber: Number(t.ticketNumber),
    ticketDate: t.ticketDate,
    ticketDateTime: t.ticketDateTime,
    netWeight: Number(t.netWeight),
    grandTotal: t.grandTotal == null ? null : Number(t.grandTotal),
    regionKey: t.regionKey,
    locationKey: t.locationKey,
    locationName: t.location?.locationName ?? null,
    locationCostCenter: t.location?.costCenter ?? null,
    orderKey: t.orderKey,
    orderNumber: t.order?.orderNumber ?? null,
    orderDescription: t.order?.description ?? null,
    customerKey: t.customerKey,
    customerID: t.customer?.customerID ?? null,
    customerName: t.customer?.customerName ?? null,
    truckKey: t.truckKey,
    truckID: t.truck?.truckID ?? null,
    haulerLabel,
    productKey: t.productKey,
    productID: t.product?.productID ?? null,
    productDescription: t.product?.productDescription ?? null,
  }
}

/**
 * Fetch non-void tickets for the active filters, newest first. The API
 * list isn't paged, so the date range is what bounds the result; every
 * dashboard panel derives its numbers from this one set client-side.
 */
export async function fetchDashboardTickets(
  filters: DashboardFilters,
): Promise<ReadonlyArray<DashboardTicket>> {
  const where: Record<string, unknown> = {
    void: { eq: false },
    ticketDate: { gte: filters.fromDate, lte: filters.toDate },
  }
  if (filters.regionKeys.length > 0) {
    where.regionKey = { in: [...filters.regionKeys] }
  }
  if (filters.locationKeys.length > 0) {
    where.locationKey = { in: [...filters.locationKeys] }
  }

  const data = await graphql<{ loadTickets: ReadonlyArray<RawTicket> | null }>(
    DASHBOARD_TICKETS,
    { where, order: [{ ticketDateTime: 'DESC' }] },
  )
  return (data.loadTickets ?? []).map(flatten)
}
