import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile, GradingScale } from '@/types'
import { JNTUH_R25 } from '@/constants/grading'

interface ProfileState {
  profile: UserProfile | null
  gradingScale: GradingScale
  setProfile: (p: UserProfile) => void
  updateProfile: (partial: Partial<UserProfile>) => void
  setGradingScale: (scale: GradingScale) => void
  clearProfile: () => void
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      gradingScale: JNTUH_R25,

      setProfile: (p) => set({ profile: { ...p, updatedAt: p.updatedAt ?? new Date().toISOString() } }),

      updateProfile: (partial) =>
        set(state => ({
          profile: state.profile ? { ...state.profile, ...partial, updatedAt: new Date().toISOString() } : null,
        })),

      setGradingScale: (scale) => set({ gradingScale: scale }),

      clearProfile: () => set({ profile: null, gradingScale: JNTUH_R25 }),
    }),
    { name: 'acadflow-profile' }
  )
)
