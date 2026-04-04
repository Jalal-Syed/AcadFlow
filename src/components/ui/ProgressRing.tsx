interface ProgressRingProps {
  percent: number          // 0–100
  size?: number            // px, default 72
  strokeWidth?: number     // default 6
  color?: string           // hex, default zones auto
  trackColor?: string
  label?: string           // centre text override (default = percent%)
  className?: string
}

const zoneColor = (pct: number) => {
  if (pct >= 85) return '#2ED573'  // Safe — emerald
  if (pct >= 75) return '#00C9B1'  // Okay — teal
  if (pct >= 65) return '#FFA502'  // Condonable — amber
  return '#FF4757'                  // Critical — red
}

export default function ProgressRing({
  percent,
  size = 72,
  strokeWidth = 6,
  color,
  trackColor = 'rgba(255,255,255,0.07)',
  label,
  className,
}: ProgressRingProps) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, percent))
  const offset = circ - (pct / 100) * circ
  const strokeColor = color ?? zoneColor(pct)

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={trackColor} strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
        />
      </svg>
      {/* Centre label */}
      <span
        className="absolute text-text font-bold font-mono leading-none"
        style={{ fontSize: size * 0.22 }}
      >
        {label ?? `${Math.round(pct)}%`}
      </span>
    </div>
  )
}
