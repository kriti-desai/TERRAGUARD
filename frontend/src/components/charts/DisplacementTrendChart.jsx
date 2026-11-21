/**
 * DisplacementTrendChart.jsx — Recharts LineChart showing displacement_mm over time.
 * Supports multiple location lines, dark theme, tooltips.
 */
import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { format, parseISO } from 'date-fns'

// A palette of distinct colors for multi-location lines
const LINE_COLORS = [
  '#00b4d8', '#22c55e', '#f97316', '#a855f7', '#eab308',
  '#ef4444', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6',
]

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-xs shadow-xl max-w-xs">
        <div className="text-slate-400 mb-1">{label}</div>
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-300">{p.name}:</span>
            <span className="text-slate-100 font-medium">{Number(p.value).toFixed(2)} mm</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

/**
 * Props:
 *   data: Array<{ date: string, [locationName]: number }>
 *   locations: string[]  — location names for which to draw lines
 */
export default function DisplacementTrendChart({ data = [], locations = [] }) {
  // Auto-detect location keys if not provided
  const lineKeys = locations.length > 0
    ? locations
    : (data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'date') : [])

  const formatDate = (d) => {
    try { return format(typeof d === 'string' ? parseISO(d) : new Date(d), 'dd MMM') }
    catch { return d }
  }

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        No displacement data available
      </div>
    )
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={{ stroke: '#1e3a5f' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={{ stroke: '#1e3a5f' }}
            tickLine={false}
            unit=" mm"
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          {lineKeys.length > 1 && (
            <Legend
              wrapperStyle={{ color: '#94a3b8', fontSize: 12 }}
            />
          )}
          {lineKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
