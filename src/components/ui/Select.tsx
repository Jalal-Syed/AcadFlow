import { SelectHTMLAttributes, forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  hint,
  options,
  placeholder,
  className,
  id,
  ...props
}, ref) => {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-text/70">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={clsx(
            'w-full appearance-none rounded-xl border bg-surface text-text/90',
            'text-sm pl-3.5 pr-9 py-2.5 min-h-[44px]',
            'transition-all duration-150 outline-none cursor-pointer',
            'focus:border-[#6C63FF]/60 focus:ring-2 focus:ring-[#6C63FF]/20',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            error
              ? 'border-[#FF4757]/60'
              : 'border-border/[0.08]',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="text-text/30">
              {placeholder}
            </option>
          )}
          {options.map(opt => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
              className="bg-card text-text"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text/35 pointer-events-none"
        />
      </div>
      {error && <p className="text-xs text-[#FF4757]">{error}</p>}
      {hint && !error && <p className="text-xs text-text/35">{hint}</p>}
    </div>
  )
})

Select.displayName = 'Select'
export default Select
