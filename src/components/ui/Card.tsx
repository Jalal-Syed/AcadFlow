import { HTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean
  elevated?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddings = {
  none: '',
  sm:   'p-3',
  md:   'p-5',
  lg:   'p-6',
}

const Card = forwardRef<HTMLDivElement, CardProps>(({
  glow = false,
  elevated = false,
  padding = 'md',
  className,
  children,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={clsx(
      'rounded-2xl border border-border/[0.08] backdrop-blur-[12px] transition-all duration-200',
      elevated
        ? 'bg-[rgba(30,30,53,0.9)]'
        : 'bg-card/[0.7]',
      'shadow-[0_4px_24px_rgba(0,0,0,0.3)]',
      glow && 'shadow-[0_4px_24px_rgba(0,0,0,0.3),0_0_0_1px_rgba(108,99,255,0.25),0_0_20px_rgba(108,99,255,0.1)]',
      paddings[padding],
      className
    )}
    {...props}
  >
    {children}
  </div>
))

Card.displayName = 'Card'
export default Card
