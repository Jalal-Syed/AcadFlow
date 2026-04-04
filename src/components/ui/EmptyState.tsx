import { clsx } from 'clsx'

interface EmptyStateProps {
  title: string
  description?: string
  cta?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

/** Flux owl — simplified inline SVG */
const FluxOwl = () => (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* Body */}
    <ellipse cx="36" cy="44" rx="20" ry="22" fill="#1A1A2E" stroke="#6C63FF" strokeWidth="1.5"/>
    {/* Head */}
    <ellipse cx="36" cy="24" rx="16" ry="15" fill="#1A1A2E" stroke="#6C63FF" strokeWidth="1.5"/>
    {/* Eyes */}
    <circle cx="29" cy="22" r="5" fill="#6C63FF" opacity="0.9"/>
    <circle cx="43" cy="22" r="5" fill="#6C63FF" opacity="0.9"/>
    <circle cx="29" cy="22" r="2.5" fill="#00F5D4"/>
    <circle cx="43" cy="22" r="2.5" fill="#00F5D4"/>
    {/* Beak */}
    <path d="M33 27 L36 31 L39 27 Z" fill="#FFA502"/>
    {/* Circuit wing patterns */}
    <path d="M16 44 Q10 38 14 30" stroke="#6C63FF" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
    <path d="M56 44 Q62 38 58 30" stroke="#6C63FF" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
    <circle cx="14" cy="30" r="1.5" fill="#00F5D4" opacity="0.7"/>
    <circle cx="58" cy="30" r="1.5" fill="#00F5D4" opacity="0.7"/>
    {/* Ears/tufts */}
    <path d="M24 12 L22 6 L28 10 Z" fill="#6C63FF" opacity="0.7"/>
    <path d="M48 12 L50 6 L44 10 Z" fill="#6C63FF" opacity="0.7"/>
  </svg>
)

export default function EmptyState({
  title,
  description,
  cta,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div className={clsx(
      'flex flex-col items-center justify-center text-center py-12 px-6 gap-4',
      className
    )}>
      <div className="opacity-80 animate-bounce-slow">
        {icon ?? <FluxOwl />}
      </div>
      <div className="space-y-1.5 max-w-xs">
        <p className="text-text/80 font-semibold text-sm">{title}</p>
        {description && (
          <p className="text-text/35 text-xs leading-relaxed">{description}</p>
        )}
      </div>
      {cta && <div className="mt-2">{cta}</div>}
    </div>
  )
}
