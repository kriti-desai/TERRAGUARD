import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MapPin, Search, Filter, ShieldAlert, ArrowRight,
  TrendingDown, Layers, FileText, X
} from 'lucide-react'
import RiskMap from '../components/map/RiskMap'
import RiskBadge from '../components/ui/RiskBadge'

const RISK_LEVELS = ['HIGH', 'ELEVATED', 'MODERATE', 'LOW']

export default function MapPage() {
  const [selectedLoc, setSelectedLoc] = useState(null)
  const [activeFilters, setActiveFilters] = useState(new Set(RISK_LEVELS))
  const [searchQuery, setSearchQuery] = useState('')

  const toggleFilter = (level) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(level)) {
        if (next.size > 1) next.delete(level) // Keep at least one
      } else {
        next.add(level)
      }
      return next
    })
  }

  const handleLocationClick = (location) => {
    setSelectedLoc(location)
  }

  return (
    <div className="relative h-[calc(100vh-7.5rem)] flex flex-col rounded-xl overflow-hidden border border-navy-600 bg-navy-900">
      {/* Top Filter Strip */}
      <div className="bg-navy-800/95 backdrop-blur border-b border-navy-600 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Geospatial Risk Layer</span>
        </div>

        {/* Risk Level Pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Filter:</span>
          {RISK_LEVELS.map(level => {
            const active = activeFilters.has(level)
            return (
              <button
                key={level}
                onClick={() => toggleFilter(level)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                  active
                    ? level === 'HIGH' ? 'bg-red-500/20 text-red-300 border border-red-500/50 shadow-sm shadow-red-500/20' :
                      level === 'ELEVATED' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/50' :
                      level === 'MODERATE' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50' :
                      'bg-green-500/20 text-green-300 border border-green-500/50'
                    : 'bg-navy-700/60 text-slate-500 border border-navy-600'
                }`}
              >
                {level}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Map Container */}
      <div className="relative flex-1 w-full h-full">
        <RiskMap
          externalFilter={activeFilters}
          onLocationClick={handleLocationClick}
          showFilters={false}
        />

        {/* Selected Location Details Card (Floating Overlay) */}
        {selectedLoc && (
          <div className="absolute top-4 right-4 z-[1000] w-80 max-w-[90vw] bg-navy-800/95 backdrop-blur-md border border-navy-500 rounded-xl p-4 shadow-2xl shadow-black/60 animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-2 border-b border-navy-600 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <MapPin size={15} className="text-cyan-400 flex-shrink-0" />
                  {selectedLoc.name || selectedLoc.location_name || `Location #${selectedLoc.id}`}
                </h3>
                <div className="text-xs text-slate-400 mt-0.5">
                  {selectedLoc.region ? `${selectedLoc.region}, ${selectedLoc.state || 'India'}` : 'Mining Zone'}
                </div>
              </div>
              <button
                onClick={() => setSelectedLoc(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-navy-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Assessed Risk:</span>
                <RiskBadge level={selectedLoc.risk_level || 'LOW'} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Risk Score Index:</span>
                <span className="font-bold text-cyan-400">
                  {typeof selectedLoc.risk_score === 'number' ? selectedLoc.risk_score.toFixed(1) : '—'} / 100
                </span>
              </div>

              {/* Progress Bar for Risk Score */}
              <div className="w-full bg-navy-900 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    selectedLoc.risk_level === 'HIGH' ? 'bg-red-500' :
                    selectedLoc.risk_level === 'ELEVATED' ? 'bg-orange-500' :
                    selectedLoc.risk_level === 'MODERATE' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(selectedLoc.risk_score || 0, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Displacement:</span>
                <span className="font-mono text-slate-200">
                  {selectedLoc.displacement_mm !== undefined && selectedLoc.displacement_mm !== null
                    ? `${Number(selectedLoc.displacement_mm).toFixed(2)} mm`
                    : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Coordinates:</span>
                <span className="font-mono text-slate-400">
                  {selectedLoc.latitude?.toFixed(4)}°N, {selectedLoc.longitude?.toFixed(4)}°E
                </span>
              </div>

              {selectedLoc.elevation_m && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Surface Elevation:</span>
                  <span className="font-mono text-slate-200">{selectedLoc.elevation_m} m</span>
                </div>
              )}
            </div>

            {/* Action buttons inside card */}
            <div className="pt-3 border-t border-navy-600 flex items-center gap-2">
              <Link
                to={`/app/history?location=${selectedLoc.id}`}
                className="btn-secondary flex-1 text-center text-xs py-1.5 flex items-center justify-center gap-1"
              >
                <TrendingDown size={12} /> Trends
              </Link>
              <Link
                to="/app/reports"
                className="btn-primary flex-1 text-center text-xs py-1.5 flex items-center justify-center gap-1"
              >
                <FileText size={12} /> PDF Audit
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
