import { clsx } from 'clsx'

type ChipVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger'

interface ChipProps {
  label: string
  variant?: ChipVariant
  active?: boolean
  onClick?: () => void
  onRemove?: () => void
  className?: string
}

const base: Record<ChipVariant, string> = {
  default: 'border-border/[0.12] text-text/60 hover:border-border/25 hover:text-text/80',
  primary: 'border-[#6C63FF]/40 text-[#6C63FF]',
  success: 'border-[#2ED573]/40 text-[#2ED573]',
  warning: 'border-[#FFA502]/40 text-[#FFA502]',
  danger:  'border-[#FF4757]/40 text-[#FF4757]',
}

const activeStyles: Record<ChipVariant, string> = {
  default: 'bg-white/10 border-border/25 text-text',
  primary: 'bg-[rgba(108,99,255,0.18)] border-[#6C63FF]/60 text-[#6C63FF]',
  success: 'bg-[rgba(46,213,115,0.12)] border-[#2ED573]/60 text-[#2ED573]',
  warning: 'bg-[rgba(255,165,2,0.12)]  border-[#FFA502]/60 text-[#FFA502]',
  danger:  'bg-[rgba(255,71,87,0.12)]  border-[#FF4757]/60 text-[#FF4757]',
}

export default function Chip({
  label,
  variant = 'default',
  active = false,
  onClick,
  onRemove,
  className,
}: ChipProps) {
  return (
    <span
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium',
        'transition-all duration-150 select-none',
        onClick && 'cursor-pointer',
        active ? activeStyles[variant] : `bg-transparent ${base[variant]}`,
        className
      )}
    >
      {label}
      {onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 text-current opacity-60 hover:opacity-100 leading-none"
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      )}
    </span>
  )
}
