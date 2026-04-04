import { forwardRef, ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  primary:   'bg-[#6C63FF] hover:bg-[#5a52e0] text-text shadow-glow',
  secondary: 'bg-card hover:bg-[#22224a] text-text border border-border/10',
  ghost:     'bg-transparent hover:bg-white/5 text-text/80',
  danger:    'bg-[#FF4757] hover:bg-[#e03040] text-text',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg  min-h-[32px]',
  md: 'px-4 py-2.5 text-sm rounded-xl  min-h-[44px]',
  lg: 'px-6 py-3   text-base rounded-xl min-h-[52px]',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary', size = 'md', loading = false,
  fullWidth = false, disabled, className, children, ...props
}, ref) => (
  <button
    ref={ref}
    disabled={disabled || loading}
    className={clsx(
      'inline-flex items-center justify-center gap-2 font-semibold',
      'transition-all duration-150 active:scale-95',
      'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF]',
      variants[variant],
      sizes[size],
      fullWidth && 'w-full',
      className
    )}
    {...props}
  >
    {loading && (
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    )}
    {children}
  </button>
))

Button.displayName = 'Button'
export default Button
