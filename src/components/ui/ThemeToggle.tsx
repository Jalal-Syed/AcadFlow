import { Sun, Moon } from 'lucide-react'
import { useUIStore } from '@/stores/useUIStore'

/**
 * ThemeToggle — fixed floating button, bottom-right corner, above bottom nav.
 * Visible on every page so users never have to go to Settings to switch modes.
 */
export default function ThemeToggle() {
  const { theme, setTheme } = useUIStore()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="fixed bottom-20 right-4 z-50 w-10 h-10 rounded-full
                 flex items-center justify-center
                 border border-border/[0.15] shadow-lg
                 transition-all duration-200 active:scale-90
                 bg-surface backdrop-blur-sm
                 hover:border-[#6C63FF]/50 hover:shadow-glow"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      {isDark
        ? <Sun  size={16} className="text-[#FFA502]" />
        : <Moon size={16} className="text-[#6C63FF]" />
      }
    </button>
  )
}
