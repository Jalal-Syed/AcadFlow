/**
 * Onboarding — multi-step first-run flow.
 * Spec §6.1 — Steps: Welcome → Profile → University → Semester → Subjects → Done
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useProfileStore } from '@/stores/useProfileStore'
import { seedGradingScales } from '@/db/schema'

import Welcome      from './steps/Welcome'
import Profile      from './steps/Profile'
import University   from './steps/University'
import SemesterStep from './steps/Semester'
import SubjectsStep from './steps/Subjects'
import Done         from './steps/Done'

const TOTAL_STEPS = 6

const STEP_LABELS = [
  'Welcome',
  'Your Profile',
  'University',
  'Semester',
  'Subjects',
  'All Set!',
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const { profile } = useProfileStore()

  // Redirect if already onboarded — must be in effect, not render
  useEffect(() => {
    if (profile?.onboardingComplete) navigate('/', { replace: true })
  }, [profile?.onboardingComplete, navigate])

  const goNext = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1))
  const goBack = () => setStep(s => Math.max(s - 1, 0))

  const { updateProfile } = useProfileStore()

  const finish = async () => {
    updateProfile({ onboardingComplete: true })
    await seedGradingScales()
    navigate('/', { replace: true })
  }

  const renderStep = () => {
    switch (step) {
      case 0: return <Welcome  onNext={goNext} />
      case 1: return <Profile  onNext={goNext} onBack={goBack} />
      case 2: return <University onNext={goNext} onBack={goBack} />
      case 3: return <SemesterStep onNext={goNext} onBack={goBack} />
      case 4: return <SubjectsStep onNext={goNext} onBack={goBack} />
      case 5: return <Done onFinish={finish} />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-start pt-12 pb-10 px-4 overflow-y-auto">

      {/* Progress dots */}
      <div className="flex gap-2 mb-6 sticky top-4 z-10">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step
                ? 'w-6 bg-[#6C63FF]'
                : i < step
                ? 'w-2 bg-[#6C63FF]/50'
                : 'w-2 bg-white/10'
            }`}
          />
        ))}
      </div>

      {/* Step label */}
      <p className="text-text/30 text-[11px] uppercase tracking-widest mb-5">
        {step > 0 ? `Step ${step} of ${TOTAL_STEPS - 1} · ` : ''}{STEP_LABELS[step]}
      </p>

      {/* Step content */}
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="bg-surface/90 border border-border/[0.07] rounded-2xl p-6
                       shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
