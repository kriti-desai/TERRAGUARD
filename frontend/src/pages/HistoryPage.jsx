import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  TrendingDown, Calendar, Layers, ArrowRight,
  RefreshCw, MapPin, BarChart3, Clock, AlertTriangle
} from 'lucide-react'
import { riskAPI } from '../services/api'
import DisplacementTrendChart from '../components/charts/DisplacementTrendChart'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function HistoryPage() {
  const [searchParams] = useSearchParams()
  const initialLocId = searchParams.get('location')

  const [locations, setLocations] = useState([])
  const [selectedLocId, setSelectedLocId] = useState('')
  const [compareLocId, setCompareLocId] = useState('')
  const [isComparing, setIsComparing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState([])
  const [chartLocations, setChartLocations] = useState([])
  const [tableData, setTableData] = useState([])

  // Load available locations
  useEffect(() => {
    riskAPI.locations()
      .then(res => {
        const raw = Array.isArray(res.data) ? res.data : (res.data.items ?? [])
        const locs = raw.map(item => item.location || item)
        setLocations(locs)
        if (locs.length > 0) {
          const found = initialLocId ? locs.find(l => String(l.id) === String(initialLocId)) : null
          setSelectedLocId(found ? String(found.id) : String(locs[0].id))
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [initialLocId])

  // Fetch actual database observations for selected location(s)
  useEffect(() => {
    if (!selectedLocId || locations.length === 0) return

    const primaryLoc = locations.find(l => String(l.id) === String(selectedLocId))
    const compareLoc = isComparing && compareLocId ? locations.find(l => String(l.id) === String(compareLocId)) : null

    if (!primaryLoc) return

    const fetchObservations = async () => {
      try {
        const primaryRes = await riskAPI.observations(selectedLocId)
        const primaryObs = primaryRes.data || []

        let compareObs = []
        if (compareLoc) {
          const compRes = await riskAPI.observations(compareLocId)
          compareObs = compRes.data || []
        }

        // Build unified dates mapping
        const dateMap = new Map()

        primaryObs.forEach(obs => {
          const dStr = obs.observation_date ? obs.observation_date.split('T')[0] : `Record #${obs.id}`
          if (!dateMap.has(dStr)) dateMap.set(dStr, { date: dStr })
          dateMap.get(dStr)[primaryLoc.name] = obs.displacement_mm != null ? Number(obs.displacement_mm.toFixed(2)) : null
        })

        if (compareLoc) {
          compareObs.forEach(obs => {
            const dStr = obs.observation_date ? obs.observation_date.split('T')[0] : `Record #${obs.id}`
            if (!dateMap.has(dStr)) dateMap.set(dStr, { date: dStr })
            dateMap.get(dStr)[compareLoc.name] = obs.displacement_mm != null ? Number(obs.displacement_mm.toFixed(2)) : null
          })
        }

        // Sort chronologically
        const sortedSeries = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))
        setChartData(sortedSeries)
        setChartLocations(compareLoc ? [primaryLoc.name, compareLoc.name] : [primaryLoc.name])

        // Table rows for primary location
        const rows = primaryObs.map(obs => ({
          date: obs.observation_date ? obs.observation_date.split('T')[0] : 'N/A',
          displacement_mm: obs.displacement_mm != null ? obs.displacement_mm.toFixed(2) : '0.00',
          velocity_mm_year: obs.displacement_velocity_mm_year != null ? obs.displacement_velocity_mm_year.toFixed(2) : '0.00',
          rainfall_mm: obs.rainfall_mm != null ? obs.rainfall_mm.toFixed(1) : '0.0',
          mining_index: obs.mining_activity_index != null ? obs.mining_activity_index.toFixed(2) : '0.00',
        }))
        setTableData(rows)
      } catch (err) {
        console.error('Failed to load observations for history:', err)
      }
    }

    fetchObservations()
  }, [selectedLocId, compareLocId, isComparing, locations])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner label="Loading historical time-series..." />
      </div>
    )
  }

  const selectedLoc = locations.find(l => String(l.id) === String(selectedLocId))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Historical Ground Kinematics Analysis</h1>
        <p className="text-slate-400 text-sm mt-1">
          Long-term vertical deformation trajectories, subsidence velocities, and multi-temporal satellite observations.
        </p>
      </div>

      {/* Selectors Strip */}
      <div className="card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Primary Location */}
          <div>
            <label className="label text-[10px]">Primary Location</label>
            <select
              value={selectedLocId}
              onChange={(e) => setSelectedLocId(e.target.value)}
              className="input text-xs py-1.5"
            >
              {locations.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.region || 'Mining Zone'})
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Compare */}
          <div className="self-end pb-1">
            <button
              onClick={() => setIsComparing(!isComparing)}
              className={`text-xs px-3 py-2 rounded-lg font-medium border transition-colors ${
                isComparing
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-navy-800 text-slate-400 border-navy-600 hover:text-slate-200'
              }`}
            >
              {isComparing ? '✓ Comparison Enabled' : '+ Compare Another Site'}
            </button>
          </div>

          {/* Secondary Location if comparing */}
          {isComparing && (
            <div>
              <label className="label text-[10px]">Comparison Target</label>
              <select
                value={compareLocId}
                onChange={(e) => setCompareLocId(e.target.value)}
                className="input text-xs py-1.5"
              >
                <option value="">Select secondary site...</option>
                {locations.filter(l => String(l.id) !== String(selectedLocId)).map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {selectedLoc && (
          <div className="text-xs text-slate-400">
            Coordinates: <span className="font-mono text-slate-200">{selectedLoc.latitude?.toFixed(4)}°N, {selectedLoc.longitude?.toFixed(4)}°E</span>
          </div>
        )}
      </div>

      {/* Main Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title text-base">Displacement Trend (mm)</h2>
            <p className="section-sub text-xs">Vertical ground elevation changes over multi-temporal observation cycles</p>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Unit: mm (negative = downward subsidence)
          </div>
        </div>

        <div className="h-80 w-full">
          <DisplacementTrendChart
            data={chartData}
            locations={chartLocations}
          />
        </div>
      </div>

      {/* Observation Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title text-base">Observation Log Archive</h2>
            <p className="section-sub text-xs">Recorded geodetic measurements for {selectedLoc?.name || 'Selected Location'}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-navy-600 text-slate-400 font-sans">
              <tr>
                <th className="pb-2">Observation Date</th>
                <th className="pb-2">Displacement (mm)</th>
                <th className="pb-2">Velocity (mm/yr)</th>
                <th className="pb-2">Rainfall (mm)</th>
                <th className="pb-2">Mining Intensity</th>
                <th className="pb-2 text-right font-sans">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-600/40">
              {tableData.map((row, i) => (
                <tr key={i} className="hover:bg-navy-800/40">
                  <td className="py-2.5 text-slate-300 font-sans">{row.date}</td>
                  <td className={`py-2.5 font-bold ${Number(row.displacement_mm) < -30 ? 'text-red-400' : 'text-cyan-400'}`}>
                    {row.displacement_mm} mm
                  </td>
                  <td className="py-2.5 text-slate-300">{row.velocity_mm_year} mm/yr</td>
                  <td className="py-2.5 text-slate-400">{row.rainfall_mm} mm</td>
                  <td className="py-2.5 text-slate-400">{row.mining_index}</td>
                  <td className="py-2.5 text-right font-sans">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      Number(row.displacement_mm) < -30
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-green-500/20 text-green-400 border border-green-500/30'
                    }`}>
                      {Number(row.displacement_mm) < -30 ? 'ELEVATED SUBSIDENCE' : 'STABLE'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
