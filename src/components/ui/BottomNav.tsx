import { NavLink, useLocation } from 'react-router-dom'
import { Home, CalendarCheck, BookOpen, CheckSquare, MoreHorizontal, Sun, Moon } from 'lucide-react'
import { clsx } from 'clsx'
import { useUIStore } from '@/stores/useUIStore'

const NAV_ITEMS = [
  { to: '/',           icon: Home,          label: 'Home'       },
  { to: '/attendance', icon: CalendarCheck,  label: 'Attendance' },
  { to: '/grades',     icon: BookOpen,       label: 'Grades'     },
  { to: '/tasks',      icon: CheckSquare,    label: 'Tasks'      },
  { to: '/settings',   icon: MoreHorizontal, label: 'More'       },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const { theme, setTheme } = useUIStore()
  const isDark = theme === 'dark'

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 flex items-stretch
                 bg-[rgba(26,26,46,0.85)] dark:bg-[rgba(26,26,46,0.85)]
                 bg-[rgba(255,255,255,0.88)]
                 backdrop-blur-md border-t border-border/[0.10]"
      style={{
        height: 'calc(64px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        backgroundColor: isDark ? 'rgba(26,26,46,0.88)' : 'rgba(255,255,255,0.88)',
      }}
    >
      {/* Nav tabs — take up most of the bar */}
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
                isActive ? 'bg-[rgba(108,99,255,0.18)]' : 'bg-transparent'
              )}
            >
              <Icon
                size={20}
                className={clsx(
                  'transition-colors duration-150',
                  isActive ? 'text-[#6C63FF]' : 'text-text/40'
                )}
              />
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

      {/* Theme toggle — separated from nav tabs by a faint divider */}
      <div className="flex items-center justify-center px-2 border-l border-border/[0.10]">
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={clsx(
            'w-9 h-9 rounded-xl flex items-center justify-center',
            'transition-all duration-200 active:scale-90',
            'hover:bg-[rgba(108,99,255,0.12)]',
          )}
          aria-label="Toggle theme"
        >
          {isDark
            ? <Sun  size={16} className="text-[#FFA502]" />
            : <Moon size={16} className="text-[#6C63FF]" />
          }
        </button>
      </div>
    </nav>
  )
}
