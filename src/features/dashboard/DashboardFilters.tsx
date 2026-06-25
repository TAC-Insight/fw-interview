import { useEffect, useMemo, useState } from 'react'
import { Map, MapPin, RotateCw } from 'lucide-react'
import { Button } from '#/ui/Button'
import { Combobox } from '#/ui/Combobox'
import type { ComboboxOption } from '#/ui/Combobox'
import { DateRangePicker } from '#/ui/DateRangePicker'
import type { DateRange } from '#/ui/DateRangePicker'
import { fetchLocations, fetchRegions } from '#/lib/graphql'
import type {
  DashboardFilters as Filters,
  LocationRow,
  RegionRow,
} from '#/lib/graphql'
import styles from './Dashboard.module.css'

export interface DashboardFiltersProps {
  readonly value: Filters
  readonly onChange: (next: Filters) => void
  readonly onRefresh: () => void
  readonly refreshing?: boolean
}

/** Multi-select Region + Location combobox, date range, refresh button.
 *  Region selection narrows the Location list to the relevant regions. */
export function DashboardFilters({
  value,
  onChange,
  onRefresh,
  refreshing = false,
}: DashboardFiltersProps) {
  const [regions, setRegions] = useState<ReadonlyArray<RegionRow>>([])
  const [locations, setLocations] = useState<ReadonlyArray<LocationRow>>([])

  useEffect(() => {
    let active = true
    void fetchRegions()
      .then((r) => active && setRegions(r))
      .catch(() => {})
    void fetchLocations()
      .then((l) => active && setLocations(l))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const regionOptions = useMemo<ReadonlyArray<ComboboxOption<number>>>(
    () =>
      regions.map((r) => ({
        value: r.regionKey,
        label: r.regionName,
        sublabel: r.regionDescription ?? undefined,
      })),
    [regions],
  )

  const locationOptions = useMemo<ReadonlyArray<ComboboxOption<number>>>(() => {
    const scoped =
      value.regionKeys.length === 0
        ? locations
        : locations.filter((l) => value.regionKeys.includes(l.regionKey))
    return scoped.map((l) => ({
      value: l.locationKey,
      label: l.locationName,
      sublabel: l.locationDescription ?? undefined,
    }))
  }, [locations, value.regionKeys])

  const range: DateRange = { from: value.fromDate, to: value.toDate }
  const onRange = (next: DateRange) =>
    onChange({ ...value, fromDate: next.from, toDate: next.to })

  return (
    <div className={styles.filters}>
      <div className={styles.filterField}>
        <span className={styles.filterLabel}>Region</span>
        <Combobox<number>
          multiple
          options={regionOptions}
          value={value.regionKeys}
          onChange={(next) =>
            // Drop selected locations that no longer match the narrowed
            // region set so the active filters stay internally consistent.
            onChange({
              ...value,
              regionKeys: next,
              locationKeys:
                next.length === 0
                  ? value.locationKeys
                  : value.locationKeys.filter((lk) => {
                      const loc = locations.find((l) => l.locationKey === lk)
                      return loc ? next.includes(loc.regionKey) : false
                    }),
            })
          }
          placeholder="All regions"
          emptyLabel="All regions"
          searchPlaceholder="Search regions…"
          leadingIcon={<Map size={14} />}
        />
      </div>
      <div className={styles.filterField}>
        <span className={styles.filterLabel}>Location</span>
        <Combobox<number>
          multiple
          options={locationOptions}
          value={value.locationKeys}
          onChange={(next) => onChange({ ...value, locationKeys: next })}
          placeholder="All locations"
          emptyLabel="All locations"
          searchPlaceholder="Search locations…"
          leadingIcon={<MapPin size={14} />}
        />
      </div>
      <div className={styles.filterField}>
        <span className={styles.filterLabel}>Date range</span>
        <DateRangePicker value={range} onChange={onRange} />
      </div>
      <span className={styles.filterSpacer} />
      <Button
        variant="ghost"
        size="md"
        leadingIcon={<RotateCw size={14} />}
        loading={refreshing}
        onClick={onRefresh}
      >
        Refresh
      </Button>
    </div>
  )
}
