import { Sparkles } from 'lucide-react'
import { useProfileStore } from '@/stores/useProfileStore'

interface DoneProps {
  onFinish: () => void
}

export default function Done({ onFinish }: DoneProps) {
  const { profile, updateProfile } = useProfileStore()

  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-[rgba(108,99,255,0.15)] border border-[#6C63FF]/30 flex items-center justify-center animate-pulse-slow">
          <Sparkles size={32} className="text-[#6C63FF]" />
        </div>
        <span className="absolute -top-1 -right-1 text-2xl">🦉</span>
      </div>

      <div className="space-y-2">
        <h2 className="text-text text-xl font-bold">
          You're all set{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}!
        </h2>
        <p className="text-text/50 text-sm leading-relaxed max-w-xs">
          AcadFlow is ready. Start by marking today's attendance or adding your upcoming exams.
        </p>
      </div>

      {/* What's next tips */}
      <div className="w-full space-y-2 text-left">
        {[
          { emoji: '📋', text: 'Mark attendance daily — 5 seconds per subject' },
          { emoji: '📝', text: 'Log your mid-term marks as they come in' },
          { emoji: '⏰', text: 'Add exam dates for countdown timers' },
          { emoji: '✅', text: 'Create tasks for upcoming assignments' },
        ].map(tip => (
          <div key={tip.text}
            className="flex items-start gap-3 bg-white/[0.04] border border-border/[0.06] rounded-xl px-3 py-2.5">
            <span className="text-base shrink-0">{tip.emoji}</span>
            <p className="text-text/60 text-xs leading-relaxed">{tip.text}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => { updateProfile({ onboardingComplete: true }); onFinish() }}
        className="w-full py-3.5 rounded-xl bg-[#2ED573] hover:bg-[#26bb62] text-[#0D0D14] font-bold text-sm transition-colors"
      >
        Open AcadFlow →
      </button>
    </div>
  )
}
