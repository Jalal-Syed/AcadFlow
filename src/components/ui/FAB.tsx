import { Plus } from 'lucide-react'
import { clsx } from 'clsx'

interface FABProps {
  onClick: () => void
  icon?: React.ReactNode
  label?: string
  className?: string
  disabled?: boolean
}

export default function FAB({
  onClick,
  icon = <Plus size={22} />,
  label,
  className,
  disabled = false,
}: FABProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label ?? 'Add'}
      className={clsx(
        'fixed bottom-20 right-5 z-40',
        'flex items-center gap-2',
        'rounded-full bg-[#6C63FF] text-text font-semibold text-sm',
        'shadow-[0_4px_20px_rgba(108,99,255,0.5)]',
        'transition-all duration-200 active:scale-95',
        'hover:bg-[#5a52e0] hover:shadow-[0_6px_28px_rgba(108,99,255,0.65)]',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF]',
        label ? 'px-5 h-14' : 'w-14 h-14 justify-center',
        className
      )}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  )
}
