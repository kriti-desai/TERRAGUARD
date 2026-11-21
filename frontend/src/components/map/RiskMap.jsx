/**
 * RiskMap.jsx — React Leaflet map showing risk locations as colored CircleMarkers.
 * Features: OpenStreetMap tiles, risk-colored markers, popups, filters, legend.
 */
import React, { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { riskAPI } from '../../services/api'
import RiskBadge from '../ui/RiskBadge'
import LoadingSpinner from '../ui/LoadingSpinner'

// Risk level → Leaflet marker color
const RISK_COLORS = {
  HIGH:     '#ef4444',
  ELEVATED: '#f97316',
  MODERATE: '#eab308',
  LOW:      '#22c55e',
}

const ALL_LEVELS = ['HIGH', 'ELEVATED', 'MODERATE', 'LOW']

/**
 * Props:
 *   externalFilter: Set<string> | null — if provided, overrides internal checkboxes
 *   onLocationClick: (location) => void — callback when marker is clicked
 *   showFilters: boolean — whether to render built-in filter panel
 */
export default function RiskMap({ externalFilter, onLocationClick, showFilters = true }) {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeFilters, setActiveFilters] = useState(new Set(ALL_LEVELS))

  useEffect(() => {
    setLoading(true)
    riskAPI.locations()
      .then(res => {
        const data = res.data
        const raw = Array.isArray(data) ? data : (data.items ?? [])
        const normalized = raw.map(item => {
          if (item.location) {
            return {
              id: item.location.id,
              name: item.location.name,
              location_name: item.location.name,
              latitude: item.location.latitude,
              longitude: item.location.longitude,
              region: item.location.region,
              state: item.location.state,
              elevation_m: item.location.elevation_m,
              risk_level: item.latest_risk?.risk_level || 'LOW',
              risk_score: item.latest_risk?.risk_score || 0,
              displacement_mm: item.latest_risk?.displacement_factor,
              ...item.latest_risk,
            }
          }
          return item
        })
        setLocations(normalized)
      })
      .catch(() => setError('Failed to load risk locations'))
      .finally(() => setLoading(false))
  }, [])

  const toggleFilter = (level) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      next.has(level) ? next.delete(level) : next.add(level)
      return next
    })
  }

  // Use external filter set if provided, otherwise internal checkboxes
  const effectiveFilter = externalFilter ?? activeFilters

  const visibleLocations = useMemo(
    () => locations.filter(loc => effectiveFilter.has(loc.risk_level)),
    [locations, effectiveFilter]
  )

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-navy-800">
      <LoadingSpinner label="Loading risk map..." />
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-full bg-navy-800 text-red-400">{error}</div>
  )

  return (
    <div className="relative w-full h-full">
      {/* ── Filter checkboxes (top-left overlay) ── */}
      {showFilters && (
        <div className="absolute top-3 left-3 z-[1000] bg-navy-900/90 backdrop-blur border border-navy-600 rounded-xl p-3 space-y-2">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Filter Risk</div>
          {ALL_LEVELS.map(level => (
            <label key={level} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activeFilters.has(level)}
                onChange={() => toggleFilter(level)}
                className="accent-cyan-500"
              />
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS[level] }} />
              <span className="text-slate-300 text-xs">{level}</span>
            </label>
          ))}
        </div>
      )}

      {/* ── Legend (bottom-right overlay) ── */}
      <div className="absolute bottom-6 right-3 z-[1000] bg-navy-900/90 backdrop-blur border border-navy-600 rounded-xl p-3">
        <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Risk Level</div>
        {ALL_LEVELS.map(level => (
          <div key={level} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full border-2" style={{ backgroundColor: RISK_COLORS[level] + '44', borderColor: RISK_COLORS[level] }} />
            <span className="text-slate-300 text-xs">{level}</span>
          </div>
        ))}
      </div>

      {/* ── Map ── */}
      <MapContainer
        center={[22.5, 82.5]}
        zoom={5}
        style={{ height: '100%', width: '100%', background: '#0d1b2a' }}
        zoomControl={false}
      >
        <ZoomControl position="topright" />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {visibleLocations.map((loc) => {
          const color = RISK_COLORS[loc.risk_level] || '#64748b'
          return (
            <CircleMarker
              key={loc.id || `${loc.latitude}-${loc.longitude}`}
              center={[loc.latitude, loc.longitude]}
              radius={loc.risk_level === 'HIGH' ? 12 : loc.risk_level === 'ELEVATED' ? 10 : 8}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.75,
                color: color,
                weight: 2,
                opacity: 1,
              }}
              eventHandlers={{
                click: () => onLocationClick && onLocationClick(loc),
              }}
            >
              <Popup>
                <div style={{ background: '#1a2f45', color: '#e2e8f0', borderRadius: 8, padding: '10px 14px', minWidth: 200, fontFamily: 'Inter, system-ui, sans-serif' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{loc.location_name || 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{loc.region || ''}</div>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{
                      background: (RISK_COLORS[loc.risk_level] || '#64748b') + '33',
                      color: RISK_COLORS[loc.risk_level] || '#94a3b8',
                      border: `1px solid ${(RISK_COLORS[loc.risk_level] || '#64748b')}55`,
                      borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 600
                    }}>
                      {loc.risk_level}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                    <div>Score: <span style={{ color: '#e2e8f0' }}>{loc.risk_score?.toFixed(3) ?? '—'}</span></div>
                    <div>Displacement: <span style={{ color: '#e2e8f0' }}>{loc.displacement_mm?.toFixed(2) ?? '—'} mm</span></div>
                    <div>Lat: {loc.latitude?.toFixed(4)}  Lon: {loc.longitude?.toFixed(4)}</div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
