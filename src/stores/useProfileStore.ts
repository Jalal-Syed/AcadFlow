import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile, GradingScale } from '@/types'
import { JNTUH_R25 } from '@/constants/grading'
import { upsertCloudRecord } from '@/lib/cloudRecords'

interface ProfileState {
  profile: UserProfile | null
  gradingScale: GradingScale
  setProfile: (p: UserProfile) => Promise<void>
  updateProfile: (partial: Partial<UserProfile>) => Promise<void>
  setGradingScale: (scale: GradingScale) => void
  clearProfile: () => void
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      gradingScale: JNTUH_R25,

      setProfile: async (p) => {
        const profile = { ...p, updatedAt: p.updatedAt ?? new Date().toISOString() }
        await upsertCloudRecord('profile', profile)
        set({ profile })
      },

      updateProfile: async (partial) => {
        const current = useProfileStore.getState().profile
        if (!current) return
        const profile = { ...current, ...partial, updatedAt: new Date().toISOString() }
        await upsertCloudRecord('profile', profile)
        set({ profile })
      },

      setGradingScale: (scale) => set({ gradingScale: scale }),

      clearProfile: () => set({ profile: null, gradingScale: JNTUH_R25 }),
    }),
    { name: 'acadflow-profile' }
  )
)
