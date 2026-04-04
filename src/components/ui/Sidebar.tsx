import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  Home, CalendarCheck, BookOpen, Clock,
  FileText, StickyNote, CalendarDays,
  Settings, ChevronLeft, ChevronRight, GraduationCap,
  ClipboardList, Layers,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useProfileStore } from '@/stores/useProfileStore'

const NAV_ITEMS = [
  { to: '/',           icon: Home,         label: 'Dashboard'  },
  { to: '/attendance', icon: CalendarCheck, label: 'Attendance' },
  { to: '/grades',     icon: BookOpen,      label: 'Grades'     },
  { to: '/assignments', icon: ClipboardList, label: 'Assignments' },
  { to: '/timetable',  icon: Clock,         label: 'Timetable'  },
  { to: '/exams',      icon: FileText,      label: 'Exams'      },
  { to: '/notes',      icon: StickyNote,    label: 'Notes'      },
  { to: '/calendar',   icon: CalendarDays,  label: 'Calendar'   },
  { to: '/semesters',  icon: Layers,        label: 'Semesters'  },
  { to: '/settings',   icon: Settings,      label: 'Settings'   },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()
  const { profile } = useProfileStore()

  return (
    <aside
      className={clsx(
        'hidden lg:flex flex-col h-full shrink-0 transition-all duration-300',
        'bg-surface/[0.95]0 backdrop-blur-md border-r border-border/[0.08]',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo / wordmark */}
      <div className={clsx(
        'flex items-center gap-3 px-4 py-5 border-b border-border/[0.06]',
        collapsed && 'justify-center px-0'
      )}>
        <span className="shrink-0 w-8 h-8 rounded-xl bg-[#6C63FF] flex items-center justify-center shadow-[0_0_12px_rgba(108,99,255,0.5)]">
          <GraduationCap size={18} className="text-text" />
        </span>
        {!collapsed && (
          <span className="text-text font-bold text-base tracking-tight font-display">
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
                  : 'text-text/50 hover:text-text/80 hover:bg-white/[0.04]',
                collapsed && 'justify-center px-0'
              )}
            >
              {/* Active left-border accent */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-[#6C63FF]" />
              )}
              <Icon size={18} className="shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">{label}</span>
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

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className={clsx(
          'flex items-center justify-center gap-2 py-3 border-t border-border/[0.06]',
          'text-text/30 hover:text-text/60 transition-colors text-xs font-medium',
          collapsed ? 'px-0' : 'px-4'
        )}
      >
        {collapsed ? <ChevronRight size={16} /> : (
          <>
            <ChevronLeft size={16} />
            <span>Collapse</span>
          </>
        )}
      </button>
    </aside>
  )
}
