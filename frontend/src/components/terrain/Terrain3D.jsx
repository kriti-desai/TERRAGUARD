/**
 * Terrain3D.jsx — Plotly.js 3D surface plot for terrain visualization.
 * Ingests synthetic demonstration elevation grid from FastAPI /risk/terrain
 * and overlays georeferenced monitoring site coordinates.
 */
import React, { useEffect, useState } from 'react'
import Plot from 'react-plotly.js'
import { riskAPI } from '../../services/api'

const RISK_COLORS = {
  HIGH:     '#ef4444',
  ELEVATED: '#f97316',
  MODERATE: '#eab308',
  LOW:      '#22c55e',
}

/** Fallback client-side generator if offline */
function generateFallbackTerrain(size = 35) {
  const z = []
  const x = []
  const y = []
  for (let i = 0; i < size; i++) {
    const row = []
    for (let j = 0; j < size; j++) {
      const base = 220 + Math.sin(i / 3) * 45 + Math.cos(j / 4) * 35
      const cx = size / 2, cy = size / 2
      const dist = Math.sqrt((i - cx) ** 2 + (j - cy) ** 2)
      const subsidence = -45 * Math.exp(-dist * dist / (size * 1.8))
      row.push(base + subsidence + Math.random() * 5)
    }
    z.push(row)
  }
  const xArr = Array.from({ length: size }, (_, i) => 86.2 + (i / size) * 0.4)
  const yArr = Array.from({ length: size }, (_, i) => 23.55 + (i / size) * 0.4)
  return { z, x: xArr, y: yArr }
}

export default function Terrain3D({ locations = [], selectedLocation }) {
  const [terrain, setTerrain] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    riskAPI.terrain()
      .then(res => {
        if (!isMounted) return
        const data = res.data
        if (data && data.z && data.x && data.y) {
          setTerrain({
            z: data.z,
            x: data.x,
            y: data.y,
            disclaimer: data.disclaimer || 'SYNTHETIC DEMONSTRATION TERRAIN',
          })
        } else {
          setTerrain(generateFallbackTerrain())
        }
      })
      .catch(err => {
        console.warn('Backend terrain API unreachable, using synthetic model:', err)
        if (isMounted) setTerrain(generateFallbackTerrain())
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => { isMounted = false }
  }, [])

  if (loading || !terrain) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono uppercase tracking-wider">Generating 3D Elevation Topography...</span>
      </div>
    )
  }

  // Build scatter markers from actual monitored locations
  const scatterPoints = (locations && locations.length > 0)
    ? locations.map(loc => {
        const lvl = loc.risk_level || loc.latest_risk?.risk_level || 'LOW'
        const isSelected = selectedLocation && String(loc.id) === String(selectedLocation.id)
        return {
          x: loc.longitude,
          y: loc.latitude,
          z: (loc.elevation_m || 220) + 12, // elevate marker slightly above ground
          name: `${loc.name} [${lvl}]`,
          color: isSelected ? '#00b4d8' : (RISK_COLORS[lvl] || '#22c55e'),
          size: isSelected ? 12 : 8,
          symbol: isSelected ? 'cross' : 'diamond',
        }
      })
    : [
        { x: 86.42, y: 23.75, z: 235, name: 'Jharia Coalfield Core [HIGH]', color: '#ef4444', size: 9, symbol: 'diamond' },
        { x: 86.35, y: 23.78, z: 240, name: 'Sijua Colliery [ELEVATED]', color: '#f97316', size: 8, symbol: 'diamond' },
        { x: 86.48, y: 23.72, z: 230, name: 'Katras Regional Station [MODERATE]', color: '#eab308', size: 8, symbol: 'diamond' },
        { x: 86.52, y: 23.82, z: 250, name: 'Dhanbad Urban Baseline [LOW]', color: '#22c55e', size: 8, symbol: 'diamond' },
      ]

  const surfaceTrace = {
    type: 'surface',
    x: terrain.x,
    y: terrain.y,
    z: terrain.z,
    colorscale: 'Viridis',
    showscale: true,
    colorbar: {
      title: { text: 'Elevation (m)', font: { color: '#94a3b8', size: 11 } },
      tickfont: { color: '#94a3b8', size: 10 },
      bgcolor: 'rgba(26,47,69,0.8)',
      bordercolor: '#1e3a5f',
      len: 0.6,
    },
    opacity: 0.92,
    contours: {
      z: { show: true, usecolormap: true, highlightcolor: '#00b4d8', project: { z: false } }
    },
    hovertemplate: 'Lon: %{x:.4f}<br>Lat: %{y:.4f}<br>Elev: %{z:.1f}m<extra></extra>',
  }

  const scatterTrace = {
    type: 'scatter3d',
    mode: 'markers+text',
    x: scatterPoints.map(p => p.x),
    y: scatterPoints.map(p => p.y),
    z: scatterPoints.map(p => p.z),
    text: scatterPoints.map(p => p.name),
    textposition: 'top center',
    textfont: { color: '#e2e8f0', size: 10 },
    marker: {
      size: scatterPoints.map(p => p.size),
      color: scatterPoints.map(p => p.color),
      symbol: scatterPoints.map(p => p.symbol),
      line: { color: '#ffffff', width: 1.5 },
    },
    hovertemplate: '<b>%{text}</b><extra></extra>',
    name: 'Monitored Sites',
  }

  const layout = {
    paper_bgcolor: '#0f2133',
    plot_bgcolor: '#0f2133',
    font: { color: '#94a3b8', family: 'Inter, system-ui' },
    scene: {
      bgcolor: '#0d1b2a',
      xaxis: {
        title: { text: 'Longitude (°E)', font: { color: '#64748b', size: 11 } },
        gridcolor: '#1e3a5f',
        zerolinecolor: '#1e3a5f',
        tickfont: { color: '#64748b', size: 9 },
      },
      yaxis: {
        title: { text: 'Latitude (°N)', font: { color: '#64748b', size: 11 } },
        gridcolor: '#1e3a5f',
        zerolinecolor: '#1e3a5f',
        tickfont: { color: '#64748b', size: 9 },
      },
      zaxis: {
        title: { text: 'Elevation (m)', font: { color: '#64748b', size: 11 } },
        gridcolor: '#1e3a5f',
        zerolinecolor: '#1e3a5f',
        tickfont: { color: '#64748b', size: 9 },
      },
      camera: { eye: { x: 1.5, y: -1.5, z: 1.2 } },
    },
    margin: { l: 0, r: 0, t: 30, b: 0 },
    annotations: [{
      text: 'SYNTHETIC DEMONSTRATION TERRAIN — NOT AN IN-SITU SURVEY',
      x: 0.5, y: 0.98,
      xref: 'paper', yref: 'paper',
      showarrow: false,
      font: { size: 10, color: '#f97316' },
      bgcolor: 'rgba(249,115,22,0.1)',
      bordercolor: '#f97316',
      borderwidth: 1,
      borderpad: 4,
    }],
    showlegend: true,
    legend: {
      x: 0.01, y: 0.95,
      bgcolor: 'rgba(26,47,69,0.8)',
      bordercolor: '#1e3a5f',
      borderwidth: 1,
      font: { color: '#94a3b8', size: 11 },
    },
  }

  return (
    <Plot
      data={[surfaceTrace, scatterTrace]}
      layout={layout}
      config={{ displayModeBar: true, responsive: true, displaylogo: false }}
      style={{ width: '100%', height: '100%' }}
      useResizeHandler
    />
  )
}
