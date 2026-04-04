import { HTMLAttributes } from 'react'
import { clsx } from 'clsx'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary'
type BadgeSize    = 'sm' | 'md'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
}

const variants: Record<BadgeVariant, string> = {
  default:  'bg-white/10 text-text/70 border-border/10',
  primary:  'bg-[rgba(108,99,255,0.15)] text-[#6C63FF] border-[rgba(108,99,255,0.4)]',
  success:  'bg-[rgba(46,213,115,0.12)] text-[#2ED573] border-[rgba(46,213,115,0.35)]',
  warning:  'bg-[rgba(255,165,2,0.12)]  text-[#FFA502] border-[rgba(255,165,2,0.35)]',
  danger:   'bg-[rgba(255,71,87,0.12)]  text-[#FF4757] border-[rgba(255,71,87,0.35)]',
  info:     'bg-[rgba(30,144,255,0.12)] text-[#1E90FF] border-[rgba(30,144,255,0.35)]',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-white/50',
  primary: 'bg-[#6C63FF]',
  success: 'bg-[#2ED573]',
  warning: 'bg-[#FFA502]',
  danger:  'bg-[#FF4757]',
  info:    'bg-[#1E90FF]',
}

const sizes: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-2 py-0.5 gap-1',
  md: 'text-xs     px-2.5 py-1 gap-1.5',
}

export default function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border font-semibold',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={clsx('rounded-full shrink-0', dotColors[variant],
          size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
        )} />
      )}
      {children}
    </span>
  )
}
