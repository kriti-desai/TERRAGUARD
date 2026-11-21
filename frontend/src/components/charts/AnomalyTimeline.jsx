/**
 * AnomalyTimeline.jsx — Recharts BarChart showing anomaly scores over time/index.
 * Anomalous points rendered in red, normal points in cyan.
 */
import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer, ReferenceLine
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    const val = payload[0]?.value
    const isAnomaly = payload[0]?.payload?.is_anomaly
    return (
      <div className="bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-xs shadow-xl">
        <div className="text-slate-400 mb-1">Point #{label}</div>
        <div className={`font-bold ${isAnomaly ? 'text-red-400' : 'text-cyan-400'}`}>
          Score: {Number(val).toFixed(4)}
        </div>
        <div className={`mt-0.5 ${isAnomaly ? 'text-red-300' : 'text-green-400'}`}>
          {isAnomaly ? '⚠ ANOMALY' : '✓ Normal'}
        </div>
      </div>
    )
  }
  return null
}

/**
 * Props:
 *   data: Array<{ index: number, score: number, is_anomaly: boolean }>
 */
export default function AnomalyTimeline({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Run an analysis to see anomaly scores
      </div>
    )
  }

  // Determine threshold line (e.g. where anomalies begin - min anomaly score)
  const anomalyScores = data.filter(d => d.is_anomaly).map(d => d.score)
  const threshold = anomalyScores.length > 0 ? Math.min(...anomalyScores) : null

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
          <XAxis
            dataKey="index"
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={{ stroke: '#1e3a5f' }}
            tickLine={false}
            label={{ value: 'Data Point Index', position: 'insideBottom', offset: -2, fill: '#475569', fontSize: 11 }}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={{ stroke: '#1e3a5f' }}
            tickLine={false}
            label={{ value: 'Score', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          {threshold !== null && (
            <ReferenceLine
              y={threshold}
              stroke="#ef4444"
              strokeDasharray="4 2"
              label={{ value: 'Threshold', fill: '#ef4444', fontSize: 10, position: 'right' }}
            />
          )}
          <Bar dataKey="score" radius={[2, 2, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.is_anomaly ? '#ef4444' : '#00b4d8'}
                fillOpacity={entry.is_anomaly ? 1 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
