/**
 * RiskDistributionChart.jsx — Recharts PieChart showing risk level distribution.
 * Colors match the design system: HIGH=red, ELEVATED=orange, MODERATE=yellow, LOW=green.
 */
import React from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const RISK_COLORS = {
  HIGH:     '#ef4444',
  ELEVATED: '#f97316',
  MODERATE: '#eab308',
  LOW:      '#22c55e',
}

const DEFAULT_DATA = [
  { name: 'HIGH',     value: 0 },
  { name: 'ELEVATED', value: 0 },
  { name: 'MODERATE', value: 0 },
  { name: 'LOW',      value: 0 },
]

/** Custom tooltip for the pie chart */
const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    const { name, value } = payload[0].payload
    return (
      <div className="bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-sm shadow-xl">
        <div className="text-slate-300 font-medium">{name}</div>
        <div className="text-cyan-400 font-bold">{value} location{value !== 1 ? 's' : ''}</div>
      </div>
    )
  }
  return null
}

/** Custom legend renderer */
const CustomLegend = ({ payload }) => (
  <div className="flex flex-wrap justify-center gap-3 mt-2">
    {payload.map(entry => (
      <div key={entry.value} className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
        <span className="text-slate-400 text-xs">{entry.value}</span>
      </div>
    ))}
  </div>
)

export default function RiskDistributionChart({ data }) {
  // Normalize incoming data to expected shape: { name, value }
  const normalizedData = (data && data.length > 0)
    ? data.map(d => ({
        name: d.name || d.risk_level || 'UNKNOWN',
        value: Number(d.value ?? d.count ?? 0),
      }))
    : DEFAULT_DATA
  const hasData = normalizedData.some(d => d.value > 0)

  return (
    <div className="w-full h-64">
      {!hasData ? (
        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
          No risk data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={normalizedData}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {normalizedData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={RISK_COLORS[entry.name] || '#64748b'}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
