import { clsx } from 'clsx'

type BarVariant = 'auto' | 'primary' | 'success' | 'warning' | 'danger'

interface ProgressBarProps {
  value: number          // 0–100
  max?: number           // default 100
  variant?: BarVariant
  height?: number        // px, default 8
  showLabel?: boolean
  label?: string
  className?: string
  animate?: boolean
}

const variantColor: Record<BarVariant, string> = {
  auto:    '',            // computed from value
  primary: '#6C63FF',
  success: '#2ED573',
  warning: '#FFA502',
  danger:  '#FF4757',
}

const autoColor = (pct: number) => {
  if (pct >= 85) return '#2ED573'
  if (pct >= 75) return '#00C9B1'
  if (pct >= 65) return '#FFA502'
  return '#FF4757'
}

export default function ProgressBar({
  value,
  max = 100,
  variant = 'auto',
  height = 8,
  showLabel = false,
  label,
  className,
  animate = true,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const color = variant === 'auto' ? autoColor(pct) : variantColor[variant]

  return (
    <div className={clsx('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-text/50">{label}</span>}
          {showLabel && <span className="text-xs font-mono text-text/60">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden bg-white/[0.07]"
        style={{ height }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}60`,
            transition: animate ? 'width 0.6s ease' : undefined,
          }}
        />
      </div>
    </div>
  )
}
