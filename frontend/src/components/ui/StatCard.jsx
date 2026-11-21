/**
 * StatCard.jsx — Metric display card with icon, value, label, and sub-text.
 * accent: 'cyan' | 'red' | 'orange' | 'yellow' | 'green'
 */
import React from 'react'

const ACCENT_COLORS = {
  cyan:   { icon: 'text-cyan-400 bg-cyan-400/10',   border: 'border-cyan-500/20' },
  red:    { icon: 'text-red-400 bg-red-400/10',     border: 'border-red-500/20' },
  orange: { icon: 'text-orange-400 bg-orange-400/10', border: 'border-orange-500/20' },
  yellow: { icon: 'text-yellow-400 bg-yellow-400/10', border: 'border-yellow-500/20' },
  green:  { icon: 'text-green-400 bg-green-400/10', border: 'border-green-500/20' },
}

export default function StatCard({ icon: Icon, label, value, sub, accent = 'cyan', loading = false }) {
  const colors = ACCENT_COLORS[accent] || ACCENT_COLORS.cyan

  return (
    <div className={`card flex items-start gap-4 border ${colors.border}`}>
      {/* Icon bubble */}
      <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${colors.icon}`}>
        {Icon && <Icon size={22} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">{label}</div>
        {loading ? (
          <div className="h-7 w-16 bg-navy-600 rounded animate-pulse" />
        ) : (
          <div className="text-2xl font-bold text-slate-100">{value ?? '—'}</div>
        )}
        {sub && (
          <div className="text-slate-500 text-xs mt-1 truncate">{sub}</div>
        )}
      </div>
    </div>
  )
}
