import { forwardRef, InputHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  className,
  id,
  ...props
}, ref) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-text/70"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text/35 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-xl border bg-white/[0.04] text-text/90 placeholder:text-text/25',
            'text-sm transition-all duration-150 outline-none',
            'focus:bg-white/[0.06] focus:border-[#6C63FF]/60 focus:ring-2 focus:ring-[#6C63FF]/20',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            error
              ? 'border-[#FF4757]/60 focus:border-[#FF4757]/80 focus:ring-[#FF4757]/20'
              : 'border-border/[0.08]',
            leftIcon ? 'pl-9' : 'pl-3.5',
            rightIcon ? 'pr-9' : 'pr-3.5',
            'py-2.5 min-h-[44px]',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text/35">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-[#FF4757]">{error}</p>}
      {hint && !error && <p className="text-xs text-text/35">{hint}</p>}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
