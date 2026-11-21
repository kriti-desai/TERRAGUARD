import React, { useState, useEffect } from 'react'
import {
  FileText, Download, CheckCircle, AlertCircle, RefreshCw,
  Printer, Shield, MapPin, Calendar
} from 'lucide-react'
import { reportAPI, riskAPI } from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [locations, setLocations] = useState([])
  const [selectedLocId, setSelectedLocId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState('')

  const loadData = async () => {
    try {
      const [repRes, locRes] = await Promise.all([
        reportAPI.list(),
        riskAPI.locations(),
      ])
      setReports(repRes.data)
      const raw = Array.isArray(locRes.data) ? locRes.data : (locRes.data.items ?? [])
      const locs = raw.map(item => item.location || item)
      setLocations(locs)
      if (locs.length > 0) setSelectedLocId(String(locs[0].id))
    } catch (err) {
      console.error(err)
      setError('Failed to fetch reports or locations.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleGenerateReport = async (e) => {
    e.preventDefault()
    if (!selectedLocId) return

    setGenerating(true)
    setError(null)
    setSuccess('')

    try {
      const res = await reportAPI.generate({
        location_id: Number(selectedLocId),
      })
      setSuccess(`Report #${res.data.id} compiled successfully! Ready for download.`)
      // Refresh list
      const repRes = await reportAPI.list()
      setReports(repRes.data)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Failed to compile PDF report.')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async (reportId) => {
    try {
      const res = await reportAPI.download(reportId)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `TERRAGUARD_Report_${reportId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
    } catch (err) {
      console.error(err)
      setError('Failed to download report PDF.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Audit & Evidence PDF Report Generation</h1>
        <p className="text-slate-400 text-sm mt-1">
          Compile certified, publication-grade geodetic audit documents formatted for DGMS, mining authorities, and emergency teams.
        </p>
      </div>

      {/* Generator Card */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Printer size={18} className="text-cyan-400" />
          <h2 className="section-title text-base mb-0">Generate Location Subsidence Audit Report</h2>
        </div>
        <p className="section-sub text-xs">
          Select a monitored location node to compile geodetic displacement trajectories, ML anomaly results, and regulatory mitigation directives into a ReportLab PDF.
        </p>

        <form onSubmit={handleGenerateReport} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-2">
          <div className="flex-1">
            <label className="label">Monitored Mining Site</label>
            <select
              value={selectedLocId}
              onChange={(e) => setSelectedLocId(e.target.value)}
              className="input text-xs"
              disabled={generating}
            >
              {locations.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.region || 'Mining Belt'})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={generating || locations.length === 0}
            className="btn-primary flex items-center justify-center gap-2 text-xs py-2.5 px-5"
          >
            {generating ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Compiling ReportLab PDF...
              </>
            ) : (
              <>
                <FileText size={14} />
                Generate Audit PDF
              </>
            )}
          </button>
        </form>

        {success && (
          <div className="mt-4 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg p-3 text-xs flex items-center gap-2">
            <CheckCircle size={15} />
            {success}
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-xs flex items-center gap-2">
            <AlertCircle size={15} />
            {error}
          </div>
        )}
      </div>

      {/* Reports Archive */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title text-base">Generated Reports Repository</h2>
            <p className="section-sub text-xs">Available PDF dossiers ready for download and archiving.</p>
          </div>
          <button onClick={loadData} className="btn-secondary text-xs p-2">
            <RefreshCw size={14} />
          </button>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <LoadingSpinner label="Loading archive..." />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No reports generated yet. Use the generator above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-navy-600 text-slate-400">
                <tr>
                  <th className="pb-2">Report ID</th>
                  <th className="pb-2">Target Location</th>
                  <th className="pb-2">Analysis Run</th>
                  <th className="pb-2">Compiled At</th>
                  <th className="pb-2 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-600/40">
                {reports.map(rep => {
                  const loc = locations.find(l => l.id === rep.location_id)
                  return (
                    <tr key={rep.id} className="hover:bg-navy-800/40">
                      <td className="py-2.5 font-mono text-cyan-400 font-bold">TG-RPT-00{rep.id}</td>
                      <td className="py-2.5 font-medium text-slate-200">
                        {loc ? loc.name : `Location #${rep.location_id}`}
                      </td>
                      <td className="py-2.5 text-slate-400 font-mono">
                        {rep.analysis_run_id ? `#${rep.analysis_run_id}` : 'Latest Telemetry'}
                      </td>
                      <td className="py-2.5 text-slate-400">
                        {rep.generated_at ? new Date(rep.generated_at).toLocaleString() : 'Recent'}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => handleDownload(rep.id)}
                          className="btn-secondary text-xs py-1 px-3 inline-flex items-center gap-1.5"
                        >
                          <Download size={13} />
                          Download PDF
                        </button>
                      </td>
                    </tr>
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
