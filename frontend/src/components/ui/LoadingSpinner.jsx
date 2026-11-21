/**
 * LoadingSpinner.jsx — Animated spinner with optional label.
 */
import React from 'react'

export default function LoadingSpinner({ label = 'Loading...', size = 'md' }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className={`${sizes[size]} border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin`} />
      {label && <span className="text-slate-400 text-sm">{label}</span>}
    </div>
  )
}
