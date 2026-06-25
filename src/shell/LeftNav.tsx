import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  LogOut,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Scale,
  Search as SearchIcon,
  Settings,
  Sun,
  X,
} from 'lucide-react'
import { clearApiKey } from '#/lib/auth'
import { NAV_ITEMS } from '#/lib/nav'
import { fetchSessionInfo } from '#/lib/graphql'
import type { SessionInfo } from '#/lib/graphql'
import { Combobox } from '#/ui/Combobox'
import { useTheme } from './useTheme'
import paletteStyles from './JumpBar.module.css'
import styles from './LeftNav.module.css'

const initialsOf = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'FW'

export interface LeftNavProps {
  readonly collapsed: boolean
  readonly onToggleCollapsed: () => void
  readonly isMobile: boolean
  readonly mobileOpen: boolean
  readonly onCloseMobile: () => void
}

export function LeftNav({
  collapsed,
  onToggleCollapsed,
  isMobile,
  mobileOpen,
  onCloseMobile,
}: LeftNavProps) {
  const navigate = useNavigate()
  const { preference, cyclePreference } = useTheme()
  const [session, setSession] = useState<SessionInfo | null>(null)

  useEffect(() => {
    let active = true
    void fetchSessionInfo()
      .then((s) => active && setSession(s))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const railCollapsed = !isMobile && collapsed
  const fullName = session?.fullname ?? 'Fastweigh User'
  const tenant = session?.tenantID ?? '—'

  const signOut = () => {
    clearApiKey()
    void navigate({ to: '/login' })
  }

  return (
    <nav
      className={styles.nav}
      data-collapsed={railCollapsed ? 'true' : undefined}
      data-mobile-open={isMobile && mobileOpen ? 'true' : undefined}
      aria-hidden={isMobile && !mobileOpen ? 'true' : undefined}
    >
      <div className={styles.header}>
        <img
          src={railCollapsed ? '/fwicon.svg' : '/fwlogo.svg'}
          alt="Fastweigh"
          className={styles.brand}
        />
        <button
          type="button"
          className={styles.iconBtn}
          onClick={isMobile ? onCloseMobile : onToggleCollapsed}
          title={
            isMobile
              ? 'Close menu'
              : collapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
          }
          aria-label={isMobile ? 'Close menu' : undefined}
        >
          {isMobile ? (
            <X size={16} />
          ) : collapsed ? (
            <PanelLeftOpen size={16} />
          ) : (
            <PanelLeftClose size={16} />
          )}
        </button>
      </div>

      {/* Jump bar — styled stub; the command palette is out of scope. */}
      {railCollapsed ? (
        <button
          type="button"
          className={paletteStyles.launcherCollapsed}
          aria-label="Jump bar"
          title="Jump bar (⌘J)"
        >
          <SearchIcon size={16} className={paletteStyles.launcherIcon} />
        </button>
      ) : (
        <button type="button" className={paletteStyles.launcher}>
          <SearchIcon size={14} className={paletteStyles.launcherIcon} />
          <span className={paletteStyles.launcherLabel}>Jump to…</span>
          <span className={paletteStyles.launcherKbd}>⌘J</span>
        </button>
      )}

      {/* POS selector — stub (no configs wired); keeps the shell's shape. */}
      {!railCollapsed && (
        <div className={styles.posPicker}>
          <Combobox<string>
            options={[]}
            value={null}
            onChange={() => {}}
            placeholder="Select a POS"
            searchPlaceholder="Search…"
            leadingIcon={<Scale size={14} />}
          />
        </div>
      )}

      <div className={styles.divider} />

      <div className={styles.links}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              className={styles.link}
              activeProps={{ 'data-active': 'true' }}
              activeOptions={{ exact: item.to === '/' }}
              title={railCollapsed ? item.label : undefined}
              onClick={() => {
                if (isMobile) onCloseMobile()
              }}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>

      <div className={styles.spacer} />

      <div className={styles.userRow}>
        <div className={styles.avatar} title={fullName}>
          {initialsOf(fullName)}
        </div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{fullName}</span>
          <span className={styles.tenantName}>{tenant}</span>
        </div>
        <button
          type="button"
          className={styles.iconBtn}
          title={
            preference === 'system'
              ? 'Theme: system — click for light'
              : preference === 'light'
                ? 'Theme: light — click for dark'
                : 'Theme: dark — click for system'
          }
          aria-label="Cycle theme preference"
          onClick={cyclePreference}
        >
          {preference === 'system' ? (
            <Monitor size={14} />
          ) : preference === 'light' ? (
            <Sun size={14} />
          ) : (
            <Moon size={14} />
          )}
        </button>
        <button type="button" className={styles.iconBtn} title="Settings">
          <Settings size={14} />
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          title="Log out"
          onClick={signOut}
        >
          <LogOut size={14} />
        </button>
      </div>
    </nav>
  )
}
