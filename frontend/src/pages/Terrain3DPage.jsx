import React, { useState, useEffect } from 'react'
import {
  Mountain, Info, Eye, Layers, RotateCw, ZoomIn, Compass
} from 'lucide-react'
import Terrain3D from '../components/terrain/Terrain3D'
import { riskAPI } from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function Terrain3DPage() {
  const [locations, setLocations] = useState([])
  const [selectedLocId, setSelectedLocId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    riskAPI.locations()
      .then(res => {
        const raw = Array.isArray(res.data) ? res.data : (res.data.items ?? [])
        const locs = raw.map(item => item.location || item)
        setLocations(locs)
        if (locs.length > 0) setSelectedLocId(String(locs[0].id))
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const selectedLoc = locations.find(l => String(l.id) === String(selectedLocId))

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">3D Terrain & Subsurface Deformation Topography</h1>
        <p className="text-slate-400 text-sm mt-1">
          Interactive digital elevation surface modeling with simulated subsidence troughs and georeferenced sensor nodes.
        </p>
      </div>

      {/* Mandatory Disclaimer Box */}
      <div className="bg-navy-900/80 border border-yellow-500/30 rounded-xl p-4 text-xs text-slate-300 flex items-start gap-3">
        <Info size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-yellow-400 uppercase tracking-wide">
            Scientific Disclaimer: Demonstration Terrain Surface
          </div>
          <p className="text-slate-400 leading-relaxed">
            The 3D surface displayed below is a high-resolution mathematical simulation demonstrating terrain visualization capabilities. 
            In a statutory production deployment, this layer ingests georeferenced Digital Elevation Models (DEM) from <b>OpenTopography</b> (SRTM / ALOS PALSAR 12.5m) or <b>ISRO Bhuvan CartoDEM</b> via Rasterio and GDAL. 
            Do not interpret this synthetic visualization as an in-situ geological cavity survey.
          </p>
        </div>
      </div>

      {/* Control Strip */}
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Mountain size={18} className="text-cyan-400" />
          <div>
            <label className="label text-[10px] mb-0">Focus Region Target</label>
            <select
              value={selectedLocId}
              onChange={(e) => setSelectedLocId(e.target.value)}
              className="input text-xs py-1"
            >
              {locations.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.region || 'Mining Belt'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Compass size={14} className="text-cyan-400" /> Click and drag to rotate surface in 3D
          </span>
          <span className="flex items-center gap-1.5 hidden sm:inline-flex">
            <ZoomIn size={14} className="text-cyan-400" /> Scroll to zoom
          </span>
        </div>
      </div>

      {/* 3D Terrain Plot Card */}
      <div className="card p-2 sm:p-4 bg-navy-900 border-navy-600">
        <div className="h-[520px] w-full rounded-lg overflow-hidden">
          <Terrain3D locations={locations} selectedLocation={selectedLoc} />
        </div>
      </div>
    </div>
  )
}
