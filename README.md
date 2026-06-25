# Fastweigh — Product Engineer Technical Session

This repo is the **stubbed application shell** for a live, 90-minute Product
Engineer session. It's also your **pre-read**: read this before your session so
you walk in oriented and can spend the live time on the interesting parts.
There's nothing to submit ahead of time.

The shell gives you a signed-in console UI — a left nav, a finished Dashboard
wired to live data, and a set of stubbed pages. **The shell is deliberately
just the shell.** Your task in the session is to design and build a slice of the
**local-first data + sync layer** on top of it: local persistence, caching, offline support, an
outbox/sync engine, and the data layer that feeds the UI. None of that is
implemented here, on purpose.

---

## Format

- **90 minutes**, live, with a couple of Fastweigh engineers.
- **One continuous problem**, worked end to end. In priority order:
  1. **Scope it** — decide what to build, what to cut, and in what order.
  2. **Design it** — storage, sync, the architecture, and the trade-offs behind your calls.
  3. **Build a slice** — get hands on code for the part that matters most.
- The earlier items carry the most weight. The shell exists so you can get to
  these fast.

A note up front so you can pace yourself: **the problem as written is
deliberately larger than 90 minutes.** We don't expect you to finish, so
prioritize accordingly — sharp scoping and a well-reasoned design count for more
than volume of code. A focused slice that demonstrates a strong design beats
sprawling code that never steps back to think.

---

## The domain (quick context)

Fastweigh runs **scale-ticketing and POS** for the aggregates, asphalt, and
bulk-trucking industries. The core transactional record is the
**load ticket** — created at a scale house when a truck is weighed and loaded.

The operational reality that drives this whole exercise: **scale houses lose
connectivity.** They sit at quarries, pits, and plants where the network is
unreliable or absent. The POS has to keep taking tickets when it's offline, and
those tickets cannot be lost. They have to make it to the cloud when the
connection comes back.

---

## The problem

Design — and build a slice of — the **data layer for an offline-capable POS
module.**

Sync a set of entities from our public GraphQL API into the browser, cache them
durably, allow ticket creation while offline, and make the local data queryable
for reporting and on-device PDF generation.

### Entities to sync

Roughly ten entities, with approximate per-tenant row counts. **The scale
varies enormously across entities — that's not an accident, and it's worth
thinking about what it implies.**

| Entity           | Approx. rows (per tenant)                                          |
| ---------------- | ------------------------------------------------------------------ |
| Customers        | thousands                                                          |
| Orders           | thousands                                                          |
| Order Products   | tens of thousands                                                  |
| Products         | hundreds                                                           |
| Trucks           | thousands                                                          |
| Haulers          | hundreds                                                           |
| Regions          | tens                                                               |
| Locations        | tens                                                               |
| Yards            | tens                                                               |
| **Load Tickets** | **highly variable — 10–50k for many tenants, 1,000,000+ for some** |

Load Tickets is the primary transactional record and by far the largest and most
variable table.

### Requirements

1. **Offline availability.** Data needed for POS operation is available with no
   network.
2. **Offline writes.** Tickets can be created while offline.
3. **Durability.** Storage is durable. To the best of our ability, we guarantee
   that an offline transaction makes it to the cloud — it survives reloads,
   crashes, and reconnection.
4. **Queryable local data.** Data is stored so the frontend can query it
   directly for reporting and ticket PDF generation — ideally through an
   interface that supports ad-hoc queries against the local data.
   - **Ticket generation:** to produce a ticket in the POS, your query layer
     will be handed a **`ticketKey`** identifying a single load ticket. Given
     that key, you need to retrieve that ticket and everything required to
     render it.
5. **Sync & status UX.** The UI communicates — subtly, not obtrusively —
   online/offline state, sync progress, and anything else that helps an operator
   trust the system.

The **persistence/storage approach is intentionally left open** — choosing it
(and defending the choice) is part of the exercise.

---

## The API

**`graphql.fast-weigh.com`** — our public GraphQL API. The shell already has the
client wired up with auth and one working sample query (the Dashboard's
`loadTickets` query — see below). Spend some prep time poking at the schema so
you're not discovering it live: get familiar with the entities above and how
they relate, and know how you'd pull each one.

`src/lib/graphql.ts` is a **minimal** `fetch`-based client pointed at
`https://graphql.fast-weigh.com/graphql`. It attaches the stored API key as a
`Bearer` token and exposes a generic `graphql<TData>(query, variables)` helper
plus typed query functions used by the dashboard (`fetchDashboardTickets`,
`fetchRegions`, `fetchLocations`, `fetchSessionInfo`). It fetches live, straight
to the network, every time — there is **nothing between the UI and the wire**.
That's the gap you're filling.

---

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build      # type-check (tsc) + production build (vite)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint (tanstack config)
npm run test       # vitest (green with no tests yet)
npm run format     # prettier --write + eslint --fix
npm run generate-routes   # regenerate src/routeTree.gen.ts (also runs in dev)
```

## Auth

Auth is a single **API key**. On first load you're redirected to `/login`. The
local login gate does **no validation** — any non-empty string lets you in,
because there's no backend session here. The key is stored in `localStorage`
(`fw-interview.apiKey`) and sent as a `Bearer` token by the GraphQL client.
Every page except `/login` is gated: the `/_app` layout route's `beforeLoad`
reads the key synchronously and redirects out if it's missing. Sign out
(sidebar, bottom-left) clears the key.

> **You need a real key to load live data.** The login gate accepts any string,
> but `graphql.fast-weigh.com` rejects anything that isn't a valid
> Fastweigh-issued key — so the Dashboard (and any query you run) shows an auth
> error until you enter a real one. **We'll give you a key for the session**; if
> you want to explore the API during prep, ask us for one ahead of time.

## Pages

- **Home** (`/`) — the dashboard, **wired to live data** and ported from
  fw-unified: a Region / Location / date-range filter row, a six-cell summary
  strip (loads, units, customers, orders, trucks, products), a tabbed breakdown
  table (Products / Customers / Orders / Trucks / Locations) beside a recent-
  tickets table, and a units-by-date area chart. Everything derives from one
  `loadTickets` query against `graphql.fast-weigh.com`, aggregated client-side.
  The date range defaults to **week-to-date**. The fetch is deliberately
  cache-less (`useDashboardData`) — the local-first cache/sync layer is your job.
- **Tickets / Sales / Fleet / Customers / Admin** — stubbed "Coming soon" empty
  states.

The nav's "Jump to…" launcher and "Select a POS" picker are styled stubs, and
the sync-status panel is intentionally omitted — those belong to your task.

## Project structure

The app is a **React 19 + TypeScript + Vite** SPA using **TanStack Router**
(file-based routing, auto code-splitting) and **Base UI** (`@base-ui/react`) for
interactive primitives. The shell, components, and styling are ported from
`fw-unified`: **plain CSS Modules + a design-token file** (`src/styles/tokens.css`)
— no Tailwind, no CSS-in-JS. The folder layout mirrors fw-unified:

```
src/
  routes/
    __root.tsx          # Outlet + devtools; imports global CSS
    login.tsx           # API-key entry (unauthenticated)
    _app.tsx            # auth guard + <AppLayout>; wraps all signed-in pages
    _app/
      index.tsx         # Home (the dashboard)
      tickets|sales|fleet|customers|admin.tsx   # stubs
  shell/                # AppLayout, LeftNav, useNavState, useTheme
  ui/                   # Button, Input, Table, Tabs, Combobox, DateRangePicker, Tooltip, EmptyState
  features/dashboard/   # SummaryCards, BreakdownTabs, RecentTickets, UnitsByTimeChart, DashboardFilters, useDashboardData, dimensions
  lib/                  # auth (API key), graphql (client + queries), nav, cx
  styles/               # tokens.css, reset.css, globals.css
```

## What's left for you (out of scope in the shell)

No local persistence, caching, offline support, sync/outbox, or request dedup.
The only data-layer code is `src/lib/graphql.ts` (described above). Building the
local-first layer — persist, cache, work offline, queue and sync mutations — on
top of this is your task.

---

## How to prepare

You don't need to build anything in advance. Useful prep:

- **Explore the API.** Get familiar with the schema, the entities above, and how
  they relate. Know how you'd pull each one. (You'll need the API key we
  provide — ask us for one if you want to poke at the API before the session.)
- **Think about offline-first.** Caching, durable local writes,
  sync/reconciliation, conflict handling, retries. Have a mental model of the
  patterns and trade-offs before you arrive.
- **Think about the data above.** Not every entity is the same shape or size.
  What actually needs to live on the device for the POS to function offline?
  What doesn't?
- **Use whatever helps you think.** You're welcome to use AI tooling (Claude
  Code, Cursor, a chat assistant — whatever you like), any relevant
  documentation, web search, and reference materials throughout. Treat it like a
  normal work session, not a closed-book exam.
- **Be ready to choose and defend.** Storage engine, sync strategy, where the
  boundaries are. There's no single right answer; we want your reasoning.

---

## What we're looking for (in one line)

How you think, scope, and make trade-offs under realistic constraints — using
the tools you'd actually use on the job. Bring questions; interrogating the
requirements is encouraged.
