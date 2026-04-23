import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  Home, CalendarCheck, BookOpen, Clock,
  FileText, StickyNote, CalendarDays,
  Settings, ChevronLeft, ChevronRight, GraduationCap,
  ClipboardList, Layers, Sun, Moon, Link2,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useProfileStore } from '@/stores/useProfileStore'
import { useUIStore } from '@/stores/useUIStore'
import { usePortalStore } from '@/stores/usePortalStore'

const NAV_ITEMS = [
  { to: '/',            icon: Home,         label: 'Dashboard'   },
  { to: '/semesters',   icon: Layers,        label: 'Semesters'   },
  { to: '/attendance',  icon: CalendarCheck, label: 'Attendance'  },
  { to: '/grades',      icon: BookOpen,      label: 'Grades'      },
  { to: '/assignments', icon: ClipboardList, label: 'Assignments' },
  { to: '/timetable',   icon: Clock,         label: 'Timetable'   },
  { to: '/exams',       icon: FileText,      label: 'Exams'       },
  { to: '/notes',       icon: StickyNote,    label: 'Notes'       },
  { to: '/calendar',    icon: CalendarDays,  label: 'Calendar'    },
  { to: '/import',      icon: Link2,         label: 'Portal Sync' },
  { to: '/settings',    icon: Settings,      label: 'Settings'    },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()
  const { profile } = useProfileStore()
  const { theme, setTheme } = useUIStore()
  const { configuredProviders, syncStatus } = usePortalStore()
  const portalConnected = configuredProviders.length > 0
  const isDark = theme === 'dark'

  return (
    <aside
      className={clsx(
        'hidden lg:flex flex-col h-full shrink-0 transition-all duration-300',
        'bg-surface/[0.95] backdrop-blur-md border-r border-border/[0.08]',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo / wordmark */}
      <div className={clsx(
        'flex items-center gap-3 px-4 py-5 border-b border-border/[0.06]',
        collapsed && 'justify-center px-0'
      )}>
        <span className="shrink-0 w-8 h-8 rounded-xl bg-[#6C63FF] flex items-center justify-center shadow-[0_0_12px_rgba(108,99,255,0.5)]">
          <GraduationCap size={18} className="text-white" />
        </span>
        {!collapsed && (
          <span className="text-text font-bold text-base tracking-tight">
            AcadFlow
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive =
            to === '/' ? pathname === '/' : pathname.startsWith(to)

          return (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150',
                'group relative',
                isActive
                  ? 'bg-[rgba(108,99,255,0.15)] text-[#6C63FF]'
                  : 'text-text/50 hover:text-text/80 hover:bg-border/[0.06]',
                collapsed && 'justify-center px-0'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-[#6C63FF]" />
              )}
              <Icon size={18} className="shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">{label}</span>
              )}
              {/* Portal Sync live status dot */}
              {to === '/import' && portalConnected && !collapsed && (
                <span
                  className={clsx(
                    'ml-auto w-2 h-2 rounded-full shrink-0',
                    ['opening', 'waiting', 'extracting', 'saving'].includes(syncStatus)
                      ? 'bg-[#FFA502] animate-pulse'
                      : syncStatus === 'error'
                      ? 'bg-[#FF4757]'
                      : 'bg-[#2ED573]'
                  )}
                />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User profile strip */}
      {!collapsed && profile && (
        <div className="px-4 py-3 border-t border-border/[0.06]">
          <p className="text-text/80 text-xs font-medium truncate">{profile.name}</p>
          <p className="text-text/35 text-[10px] truncate mt-0.5">
            {profile.college || 'AcadFlow'}
          </p>
        </div>
      )}

      {/* Theme toggle + Collapse toggle — share the footer strip */}
      <div className={clsx(
        'flex items-center border-t border-border/[0.06]',
        collapsed ? 'flex-col py-2 gap-1' : 'flex-row'
      )}>
        {/* Theme toggle button */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
          className={clsx(
            'flex items-center justify-center rounded-xl transition-all duration-200 active:scale-90',
            'text-text/40 hover:text-text/80 hover:bg-border/[0.08]',
            collapsed ? 'w-10 h-10' : 'w-10 h-10 mx-2 my-1.5'
          )}
        >
          {isDark
            ? <Sun  size={15} className="text-[#FFA502]" />
            : <Moon size={15} className="text-[#6C63FF]" />
          }
        </button>

        {/* Collapse toggle */}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="flex-1 flex items-center justify-end gap-1.5 pr-4 py-3
                       text-text/30 hover:text-text/60 transition-colors text-xs font-medium"
          >
            <ChevronLeft size={16} />
            <span>Collapse</span>
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-10 h-10 flex items-center justify-center
                       text-text/30 hover:text-text/60 transition-colors rounded-xl
                       hover:bg-border/[0.08]"
            title="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </aside>
  )
}
