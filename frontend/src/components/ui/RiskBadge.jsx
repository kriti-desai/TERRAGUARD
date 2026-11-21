/**
 * RiskBadge.jsx — Colored pill badge showing risk level.
 * Supports: HIGH, ELEVATED, MODERATE, LOW
 */
import React from 'react'

const STYLES = {
  HIGH:     'bg-red-500/20 text-red-400 border border-red-500/30',
  ELEVATED: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  MODERATE: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  LOW:      'bg-green-500/20 text-green-400 border border-green-500/30',
}

export default function RiskBadge({ level }) {
  const cls = STYLES[level] || 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {level || 'UNKNOWN'}
    </span>
  )
}
