import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light'
type BottomNavTab = 'home' | 'attendance' | 'tasks' | 'grades' | 'more'

interface UIState {
  theme: Theme
  activeTab: BottomNavTab
  isDesktop: boolean
  openModals: string[]              // modal IDs currently open

  setTheme: (t: Theme) => void
  setActiveTab: (tab: BottomNavTab) => void
  setIsDesktop: (v: boolean) => void
  openModal: (id: string) => void
  closeModal: (id: string) => void
  isModalOpen: (id: string) => boolean
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      activeTab: 'home',
      isDesktop: typeof window !== 'undefined' && window.innerWidth > 1024,
      openModals: [],

      setTheme: (theme) => set({ theme }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setIsDesktop: (isDesktop) => set({ isDesktop }),

      openModal: (id) =>
        set(state => ({ openModals: [...state.openModals.filter(m => m !== id), id] })),

      closeModal: (id) =>
        set(state => ({ openModals: state.openModals.filter(m => m !== id) })),

      isModalOpen: (id) => get().openModals.includes(id),
    }),
    {
      name: 'acadflow-ui',
      partialize: state => ({ theme: state.theme }),  // only persist theme
    }
  )
)

// Listen to window resize and update isDesktop reactively
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    useUIStore.getState().setIsDesktop(window.innerWidth > 1024)
  })
}
