/**
 * CGPAChart.tsx
 * Recharts line chart showing SGPA per semester + CGPA trend.
 * Rendered as a simple area chart with the brand colour palette.
 */

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

interface SemesterPoint {
  label: string   // "Sem 1", "Sem 2", …
  sgpa: number
}

interface CGPAChartProps {
  data: SemesterPoint[]
  currentCGPA: number
  height?: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border/[0.1] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-text/50 mb-1">{label}</p>
      <p className="text-[#6C63FF] font-bold">SGPA: {payload[0]?.value?.toFixed(2)}</p>
    </div>
  )
}

export default function CGPAChart({ data, currentCGPA, height = 180 }: CGPAChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="rounded-2xl border border-border/[0.07] bg-card/50 flex items-center justify-center"
        style={{ height }}
      >
        <p className="text-text/20 text-xs">No semester data yet</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border/[0.07] bg-card/50 p-4 space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-text/50 text-xs uppercase tracking-wider">CGPA Trend</p>
        <p className="text-text font-bold text-lg font-mono">
          {currentCGPA.toFixed(2)}
          <span className="text-text/30 text-xs ml-1">CGPA</span>
        </p>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="cgpaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6C63FF" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 10]}
            tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            ticks={[0, 5, 6, 7, 8, 9, 10]}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(108,99,255,0.3)', strokeWidth: 1 }} />
          <ReferenceLine y={7.5} stroke="rgba(46,213,115,0.3)" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="sgpa"
            stroke="#6C63FF"
            strokeWidth={2}
            fill="url(#cgpaGradient)"
            dot={{ fill: '#6C63FF', strokeWidth: 0, r: 4 }}
            activeDot={{ fill: '#6C63FF', stroke: 'rgba(108,99,255,0.4)', strokeWidth: 4, r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <p className="text-[10px] text-text/20 text-right">
        Green line = First Class with Distinction threshold (7.5)
      </p>
    </div>
  )
}
