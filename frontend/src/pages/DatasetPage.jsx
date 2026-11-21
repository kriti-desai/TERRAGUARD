import React, { useState, useEffect } from 'react'
import {
  Upload, FileText, CheckCircle, AlertCircle, Download,
  RefreshCw, Database, Play, Clock, FileSpreadsheet
} from 'lucide-react'
import { datasetAPI } from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function DatasetPage() {
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [error, setError] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)

  const loadDatasets = async () => {
    try {
      const res = await datasetAPI.list()
      setDatasets(res.data)
    } catch (err) {
      console.error(err)
      setError('Failed to fetch dataset history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDatasets()
  }, [])

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setError(null)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!selectedFile) {
      setError('Please select a CSV or GeoJSON file.')
      return
    }

    setUploading(true)
    setError(null)
    setUploadResult(null)

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const res = await datasetAPI.upload(formData)
      setUploadResult(res.data)
      setSelectedFile(null)
      loadDatasets()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Failed to upload dataset.')
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadSample = async () => {
    try {
      const res = await datasetAPI.downloadSample()
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'terraguard_sample_observations.csv')
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
    } catch (err) {
      console.error(err)
      setError('Failed to download sample CSV template.')
    }
  }

  const handleProcess = async (id) => {
    try {
      await datasetAPI.process(id)
      loadDatasets()
    } catch (err) {
      console.error(err)
      setError('Failed to process dataset.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Satellite & Ground Telemetry Ingestion</h1>
          <p className="text-slate-400 text-sm mt-1">
            Import georeferenced deformation measurements, InSAR time-series, or geological observation logs.
          </p>
        </div>
        <button
          onClick={handleDownloadSample}
          className="btn-secondary flex items-center gap-2 text-xs self-start sm:self-auto"
        >
          <Download size={14} />
          Download Sample CSV Template
        </button>
      </div>

      {/* Disclaimers & Format Note */}
      <div className="bg-navy-900/60 border border-cyan-500/20 rounded-xl p-4 text-xs text-slate-300 flex items-start gap-3">
        <Database size={18} className="text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-cyan-400">Supported Formats & Scientific Data Specification</div>
          <p className="text-slate-400">
            Accepts CSV and GeoJSON. Required columns: <code className="text-cyan-300 font-mono">latitude, longitude, observation_date, displacement_mm</code>. Optional environmental parameters: <code className="text-cyan-300 font-mono">displacement_velocity_mm_year, rainfall_mm, elevation_m, mining_activity_index</code>.
          </p>
        </div>
      </div>

      {/* Upload Box */}
      <div className="card">
        <h2 className="section-title text-base">Upload Dataset</h2>
        <p className="section-sub text-xs">Select your prepared deformation time-series dataset.</p>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="border-2 border-dashed border-navy-500 hover:border-cyan-500/50 rounded-xl p-6 text-center bg-navy-800/40 transition-colors">
            <Upload size={32} className="mx-auto text-cyan-400/80 mb-2" />
            <div className="text-sm text-slate-200 font-medium">
              {selectedFile ? (
                <span className="text-cyan-400 font-semibold">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              ) : (
                'Choose a file or drag and drop'
              )}
            </div>
            <div className="text-xs text-slate-500 mt-1">CSV or GeoJSON up to 50 MB</div>
            <input
              type="file"
              accept=".csv,.geojson,.json"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="mt-3 inline-block btn-secondary text-xs cursor-pointer"
            >
              Browse Files
            </label>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="btn-primary flex items-center gap-2 text-xs"
            >
              {uploading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Validating & Ingesting...
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Ingest Dataset
                </>
              )}
            </button>
          </div>
        </form>

        {/* Upload Success & Preview */}
        {uploadResult && (
          <div className="mt-6 pt-5 border-t border-navy-600 space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
              <CheckCircle size={16} />
              Dataset Successfully Ingested: {uploadResult.dataset?.original_filename}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-navy-800 rounded-lg p-3">
                <span className="text-slate-400 block">Total Records:</span>
                <span className="text-lg font-bold text-slate-100">{uploadResult.total_records}</span>
              </div>
              <div className="bg-navy-800 rounded-lg p-3">
                <span className="text-slate-400 block">Valid Observations:</span>
                <span className="text-lg font-bold text-green-400">{uploadResult.valid_records}</span>
              </div>
              <div className="bg-navy-800 rounded-lg p-3">
                <span className="text-slate-400 block">Format:</span>
                <span className="text-lg font-bold text-cyan-400 uppercase">{uploadResult.dataset?.file_type}</span>
              </div>
              <div className="bg-navy-800 rounded-lg p-3">
                <span className="text-slate-400 block">Status:</span>
                <span className="text-lg font-bold text-yellow-400 uppercase">{uploadResult.dataset?.status}</span>
              </div>
            </div>

            {uploadResult.preview?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Ingestion Sample Preview</div>
                <div className="overflow-x-auto border border-navy-600 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-navy-800 border-b border-navy-600 text-slate-400">
                      <tr>
                        {Object.keys(uploadResult.preview[0]).map(col => (
                          <th key={col} className="p-2 font-mono">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-600">
                      {uploadResult.preview.map((row, i) => (
                        <tr key={i} className="hover:bg-navy-800/40">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="p-2 font-mono text-slate-300">{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dataset History Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title text-base">Ingestion Archive</h2>
            <p className="section-sub text-xs">All uploaded geodetic datasets stored in database.</p>
          </div>
          <button onClick={loadDatasets} className="btn-secondary text-xs p-2">
            <RefreshCw size={14} />
          </button>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <LoadingSpinner label="Loading archive..." />
          </div>
        ) : datasets.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No datasets uploaded yet. Use the upload form above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-navy-600 text-slate-400">
                <tr>
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Filename</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Total Records</th>
                  <th className="pb-2">Valid</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Uploaded</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-600/40">
                {datasets.map(ds => (
                  <tr key={ds.id} className="hover:bg-navy-800/40">
                    <td className="py-2.5 font-mono text-slate-400">#{ds.id}</td>
                    <td className="py-2.5 font-medium text-slate-200">{ds.original_filename}</td>
                    <td className="py-2.5 uppercase font-mono text-cyan-400">{ds.file_type}</td>
                    <td className="py-2.5 text-slate-300">{ds.total_records}</td>
                    <td className="py-2.5 text-green-400">{ds.valid_records}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        ds.status === 'PROCESSED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        ds.status === 'PROCESSING' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                        ds.status === 'FAILED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      }`}>
                        {ds.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400">
                      {ds.uploaded_at ? new Date(ds.uploaded_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2.5 text-right">
                      {ds.status !== 'PROCESSED' && (
                        <button
                          onClick={() => handleProcess(ds.id)}
                          className="btn-secondary text-[11px] py-1 px-2.5"
                        >
                          Mark Processed
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
