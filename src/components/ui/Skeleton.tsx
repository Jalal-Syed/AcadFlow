import { clsx } from 'clsx'
import type { CSSProperties } from 'react'

interface SkeletonProps {
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full'
  style?: CSSProperties
}

const roundings = {
  sm:   'rounded',
  md:   'rounded-lg',
  lg:   'rounded-2xl',
  full: 'rounded-full',
}

/** Single shimmer bone */
export function Skeleton({ className, rounded = 'md', style }: SkeletonProps) {
  return (
    <div
      style={style}
      className={clsx(
        'bg-white/[0.06] animate-pulse',
        roundings[rounded],
        className
      )}
    />
  )
}

/** Pre-built card skeleton */
export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/[0.06] bg-card/60 p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10" rounded="lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-2.5 w-full" />
      <Skeleton className="h-2.5 w-4/5" />
    </div>
  )
}

/** Row list skeleton */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-1">
          <Skeleton className="w-8 h-8 shrink-0" rounded="full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3" style={{ width: `${60 + (i % 3) * 12}%` }} />
            <Skeleton className="h-2" style={{ width: `${35 + (i % 4) * 8}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default Skeleton
