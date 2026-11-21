import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldAlert, Shield, Filter, Search, ArrowRight,
  TrendingDown, Layers, FileText, Info, BarChart2
} from 'lucide-react'
import { riskAPI } from '../services/api'
import RiskBadge from '../components/ui/RiskBadge'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function RiskPage() {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterLevel, setFilterLevel] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    riskAPI.locations()
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data.items ?? [])
        setLocations(data)
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const filtered = locations.filter(item => {
    const loc = item.location
    const risk = item.latest_risk
    const level = risk?.risk_level || 'LOW'
    if (filterLevel !== 'ALL' && level !== filterLevel) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchName = loc?.name?.toLowerCase().includes(q)
      const matchRegion = loc?.region?.toLowerCase().includes(q)
      if (!matchName && !matchRegion) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Multi-Factor Subsidence Risk Assessment</h1>
        <p className="text-slate-400 text-sm mt-1">
          Provisional multi-parameter scoring engine combining geodetic kinematics, precipitation, and spatial mining intensity.
        </p>
      </div>

      {/* Methodology & Explainability Accordion / Banner */}
      <div className="bg-navy-900/70 border border-navy-600 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
          <Info size={18} />
          <span>Explainable Risk Index Methodology (Provisional v1.0)</span>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">
          The platform computes a normalized 0–100 risk score based on transparent, additive geophysical factors. 
          This avoids "black-box" overconfidence and allows geotechnical engineers to audit specific parameter contributions.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
          <div className="bg-navy-800 p-2.5 rounded-lg border border-navy-700">
            <span className="text-slate-400 block text-[11px]">Displacement</span>
            <span className="font-bold text-slate-200">Max 30 pts</span>
            <span className="text-[10px] text-slate-500 block">Vertical subsidence</span>
          </div>
          <div className="bg-navy-800 p-2.5 rounded-lg border border-navy-700">
            <span className="text-slate-400 block text-[11px]">Velocity</span>
            <span className="font-bold text-slate-200">Max 25 pts</span>
            <span className="text-[10px] text-slate-500 block">Rate mm/year</span>
          </div>
          <div className="bg-navy-800 p-2.5 rounded-lg border border-navy-700">
            <span className="text-slate-400 block text-[11px]">Rainfall</span>
            <span className="font-bold text-slate-200">Max 15 pts</span>
            <span className="text-[10px] text-slate-500 block">Hydrological trigger</span>
          </div>
          <div className="bg-navy-800 p-2.5 rounded-lg border border-navy-700">
            <span className="text-slate-400 block text-[11px]">Mining Index</span>
            <span className="font-bold text-slate-200">Max 15 pts</span>
            <span className="text-[10px] text-slate-500 block">Excavation density</span>
          </div>
          <div className="bg-navy-800 p-2.5 rounded-lg border border-navy-700">
            <span className="text-slate-400 block text-[11px]">ML Anomaly</span>
            <span className="font-bold text-slate-200">Max 15 pts</span>
            <span className="text-[10px] text-slate-500 block">Isolation Forest</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Risk Level Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'HIGH', 'ELEVATED', 'MODERATE', 'LOW'].map(lvl => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterLevel === lvl
                  ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/30'
                  : 'bg-navy-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search location or region..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-9 text-xs"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="card">
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner label="Loading risk profiles..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No locations match your filter query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-navy-600 text-slate-400">
                <tr>
                  <th className="pb-3">Location Name</th>
                  <th className="pb-3">Region</th>
                  <th className="pb-3">Risk Category</th>
                  <th className="pb-3">Risk Score</th>
                  <th className="pb-3">Factor Decomposition</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-600/40">
                {filtered.map(item => {
                  const loc = item.location
                  const risk = item.latest_risk
                  const isExpanded = expandedId === loc.id
                  const riskLevel = risk?.risk_level || 'LOW'
                  const score = risk?.risk_score ?? 15.0

                  return (
                    <React.Fragment key={loc.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : loc.id)}
                        className="hover:bg-navy-600/20 cursor-pointer transition-colors"
                      >
                        <td className="py-3 font-semibold text-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 font-mono text-[10px]">#{loc.id}</span>
                            <span>{loc.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-slate-400">
                          {loc.region || 'Mining Belt'}, {loc.state || 'India'}
                        </td>
                        <td className="py-3">
                          <RiskBadge level={riskLevel} />
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-slate-100">{score.toFixed(1)}</span>
                            <div className="w-16 bg-navy-900 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  riskLevel === 'HIGH' ? 'bg-red-500' :
                                  riskLevel === 'ELEVATED' ? 'bg-orange-500' :
                                  riskLevel === 'MODERATE' ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(score, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="text-slate-400 text-[11px]">
                            {risk?.model_method || 'Rule-based Multi-Factor'}
                          </span>
                        </td>
                        <td className="py-3 text-right space-x-2">
                          <Link
                            to={`/app/history?location=${loc.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-cyan-400 hover:text-cyan-300 font-medium text-xs inline-flex items-center gap-1"
                          >
                            Trends <ArrowRight size={12} />
                          </Link>
                        </td>
                      </tr>

                      {/* Expanded Factor Breakdown */}
                      {isExpanded && (
                        <tr className="bg-navy-800/60">
                          <td colSpan={6} className="p-4 border-l-2 border-cyan-400">
                            <div className="space-y-3">
                              <div className="font-semibold text-slate-200 text-xs">
                                Factor Contribution Breakdown for {loc.name}:
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
                                <div className="bg-navy-900/80 p-2 rounded">
                                  <div className="text-slate-400 text-[10px]">Displacement Score</div>
                                  <div className="text-slate-200 font-bold">{risk?.displacement_factor?.toFixed(1) ?? '0.0'} / 30</div>
                                </div>
                                <div className="bg-navy-900/80 p-2 rounded">
                                  <div className="text-slate-400 text-[10px]">Velocity Score</div>
                                  <div className="text-slate-200 font-bold">{risk?.velocity_factor?.toFixed(1) ?? '0.0'} / 25</div>
                                </div>
                                <div className="bg-navy-900/80 p-2 rounded">
                                  <div className="text-slate-400 text-[10px]">Rainfall Score</div>
                                  <div className="text-slate-200 font-bold">{risk?.rainfall_factor?.toFixed(1) ?? '0.0'} / 15</div>
                                </div>
                                <div className="bg-navy-900/80 p-2 rounded">
                                  <div className="text-slate-400 text-[10px]">Mining Factor</div>
                                  <div className="text-slate-200 font-bold">{risk?.mining_factor?.toFixed(1) ?? '0.0'} / 15</div>
                                </div>
                                <div className="bg-navy-900/80 p-2 rounded">
                                  <div className="text-slate-400 text-[10px]">ML Anomaly Factor</div>
                                  <div className="text-slate-200 font-bold">{risk?.anomaly_factor?.toFixed(1) ?? '0.0'} / 15</div>
                                </div>
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                                <span>Coordinates: {loc.latitude.toFixed(4)}°N, {loc.longitude.toFixed(4)}°E</span>
                                <Link to="/app/reports" className="text-cyan-400 hover:text-cyan-300">
                                  Generate Official Audit PDF &rarr;
                                </Link>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
