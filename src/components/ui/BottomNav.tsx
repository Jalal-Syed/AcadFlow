import { NavLink, useLocation } from 'react-router-dom'
import { Home, CalendarCheck, BookOpen, CheckSquare, MoreHorizontal } from 'lucide-react'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { to: '/',           icon: Home,          label: 'Home'       },
  { to: '/attendance', icon: CalendarCheck,  label: 'Attendance' },
  { to: '/grades',     icon: BookOpen,       label: 'Grades'     },
  { to: '/assignments', icon: CheckSquare,   label: 'Tasks'      },
  { to: '/settings',   icon: MoreHorizontal, label: 'More'       },
]

export default function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 h-16 flex items-stretch
                 bg-card/[0.85]0 backdrop-blur-md
                 border-t border-border/[0.08]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
        const isActive =
          to === '/' ? pathname === '/' : pathname.startsWith(to)

        return (
          <NavLink
            key={to}
            to={to}
            className="flex-1 flex flex-col items-center justify-center gap-0.5
                       min-w-0 transition-colors duration-150"
          >
            <span
              className={clsx(
                'relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-[rgba(108,99,255,0.18)]'
                  : 'bg-transparent'
              )}
            >
              <Icon
                size={20}
                className={clsx(
                  'transition-colors duration-150',
                  isActive ? 'text-[#6C63FF]' : 'text-text/40'
                )}
              />
              {/* Active glow underline */}
              {isActive && (
                <span
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2
                             w-4 h-0.5 rounded-full bg-[#6C63FF]
                             shadow-[0_0_6px_#6C63FF]"
                />
              )}
            </span>
            <span
              className={clsx(
                'text-[10px] font-medium leading-none transition-colors duration-150',
                isActive ? 'text-[#6C63FF]' : 'text-text/35'
              )}
            >
              {label}
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}
