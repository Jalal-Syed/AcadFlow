import { BookOpen } from 'lucide-react'

interface WelcomeProps {
  onNext: () => void
}

const FluxOwlLarge = () => (
  <svg width="120" height="120" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="36" cy="44" rx="20" ry="22" fill="#1A1A2E" stroke="#6C63FF" strokeWidth="1.5"/>
    <ellipse cx="36" cy="24" rx="16" ry="15" fill="#1A1A2E" stroke="#6C63FF" strokeWidth="1.5"/>
    <circle cx="29" cy="22" r="5" fill="#6C63FF" opacity="0.9"/>
    <circle cx="43" cy="22" r="5" fill="#6C63FF" opacity="0.9"/>
    <circle cx="29" cy="22" r="2.5" fill="#00F5D4"/>
    <circle cx="43" cy="22" r="2.5" fill="#00F5D4"/>
    <path d="M33 27 L36 31 L39 27 Z" fill="#FFA502"/>
    <path d="M16 44 Q10 38 14 30" stroke="#6C63FF" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
    <path d="M56 44 Q62 38 58 30" stroke="#6C63FF" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
    <circle cx="14" cy="30" r="1.5" fill="#00F5D4" opacity="0.7"/>
    <circle cx="58" cy="30" r="1.5" fill="#00F5D4" opacity="0.7"/>
    <path d="M24 12 L22 6 L28 10 Z" fill="#6C63FF" opacity="0.7"/>
    <path d="M48 12 L50 6 L44 10 Z" fill="#6C63FF" opacity="0.7"/>
  </svg>
)

export default function Welcome({ onNext }: WelcomeProps) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="animate-bounce-slow">
        <FluxOwlLarge />
      </div>

      <div className="space-y-2">
        <h1 className="text-text text-2xl font-bold tracking-tight">
          Meet <span className="text-[#6C63FF]">AcadFlow</span>
        </h1>
        <p className="text-text/50 text-sm leading-relaxed max-w-xs">
          Your semester, under control. Track attendance, marks, deadlines, and CGPA — all offline, all in one place.
        </p>
      </div>

      {/* Feature pill list */}
      <div className="flex flex-wrap justify-center gap-2">
        {[
          '📊 CGPA calculator',
          '📅 Attendance tracker',
          '✅ Deadline manager',
          '📚 Syllabus progress',
          '⏱️ Exam countdown',
        ].map(f => (
          <span
            key={f}
            className="text-xs text-text/60 bg-white/[0.06] border border-border/[0.09] px-3 py-1.5 rounded-full"
          >
            {f}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2 text-text/25 text-xs">
        <BookOpen size={13} />
        <span>Built for JNTUH R-25 · supports VTU, Anna Univ & more</span>
      </div>

      <button
        onClick={onNext}
        className="w-full py-3.5 rounded-xl bg-[#6C63FF] hover:bg-[#5a52e0] text-text font-semibold text-sm transition-colors"
      >
        Get started →
      </button>
    </div>
  )
}
