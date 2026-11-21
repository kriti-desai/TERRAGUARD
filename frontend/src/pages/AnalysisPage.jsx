import React, { useState, useEffect } from 'react'
import {
  Play, Cpu, Activity, AlertTriangle, CheckCircle, RefreshCw,
  Sliders, History, ShieldAlert, Info, Database
} from 'lucide-react'
import { analysisAPI, datasetAPI } from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import AnomalyTimeline from '../components/charts/AnomalyTimeline'

export default function AnalysisPage() {
  const [datasets, setDatasets] = useState([])
  const [selectedDatasetId, setSelectedDatasetId] = useState('')
  const [contamination, setContamination] = useState(0.12)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [anomalies, setAnomalies] = useState([])
  const [historyRuns, setHistoryRuns] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState(null)

  const loadInitialData = async () => {
    try {
      const [dsRes, histRes] = await Promise.all([
        datasetAPI.list(),
        analysisAPI.history(),
      ])
      setDatasets(dsRes.data)
      if (dsRes.data.length > 0) {
        setSelectedDatasetId(dsRes.data[0].id)
      }
      setHistoryRuns(histRes.data)
    } catch (err) {
      console.error(err)
      setError('Failed to load dataset list or history.')
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  const handleRunAnalysis = async (e) => {
    e.preventDefault()
    if (!selectedDatasetId) {
      setError('Please select a dataset to analyze.')
      return
    }

    setRunning(true)
    setError(null)

    try {
      const res = await analysisAPI.run({
        dataset_id: Number(selectedDatasetId),
        contamination: Number(contamination),
      })
      setResult(res.data)

      // Fetch the anomalies for this run
      if (res.data?.analysis_run_id) {
        const anomRes = await analysisAPI.anomalies(res.data.analysis_run_id)
        setAnomalies(anomRes.data)
      }

      // Refresh history list
      const histRes = await analysisAPI.history()
      setHistoryRuns(histRes.data)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Analysis execution failed.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">AI Anomaly Detection Pipeline</h1>
        <p className="text-slate-400 text-sm mt-1">
          Unsupervised Isolation Forest algorithm detects unusual multivariate ground deformation signatures.
        </p>
      </div>

      {/* Model Disclaimers */}
      <div className="bg-navy-900/60 border border-navy-600 rounded-xl p-4 text-xs text-slate-300 flex items-start gap-3">
        <Info size={18} className="text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-cyan-400">Model Characterization & Scientific Limitations</div>
          <p className="text-slate-400 leading-relaxed">
            The Isolation Forest model isolates observations by randomly selecting a feature and randomly selecting a split value. 
            Anomalous displacement rates require fewer partitions to isolate. 
            <b> Note:</b> Anomaly scores measure statistical deviation within the dataset. They do not constitute deterministic geotechnical predictions.
          </p>
        </div>
      </div>

      {/* Control Box */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Cpu size={18} className="text-cyan-400" />
          <h2 className="section-title text-base mb-0">Execute ML Analysis</h2>
        </div>

        <form onSubmit={handleRunAnalysis} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dataset Selector */}
            <div>
              <label className="label">Target Dataset</label>
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="input"
                disabled={running}
              >
                {datasets.length === 0 ? (
                  <option value="">No datasets available (Upload one first)</option>
                ) : (
                  datasets.map(ds => (
                    <option key={ds.id} value={ds.id}>
                      #{ds.id} — {ds.original_filename} ({ds.total_records} rows)
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Contamination Parameter Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label mb-0">Contamination Ratio (Expected Outliers)</label>
                <span className="font-mono text-cyan-400 text-xs font-bold">{(contamination * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.30"
                step="0.01"
                value={contamination}
                onChange={(e) => setContamination(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
                disabled={running}
              >
              </input>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>1% (Strict)</span>
                <span>10% (Standard)</span>
                <span>30% (Permissive)</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-xs flex items-center gap-2">
              <AlertTriangle size={15} />
              {error}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={running || datasets.length === 0}
              className="btn-primary flex items-center gap-2 text-sm px-6 py-2.5 shadow-lg shadow-cyan-500/20"
            >
              {running ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Running Isolation Forest Pipeline...
                </>
              ) : (
                <>
                  <Play size={16} />
                  RUN AI ANALYSIS
                </>
              )}
            </button>
          </div>
        </form>

        {/* Results Panel */}
        {result && (
          <div className="mt-6 pt-5 border-t border-navy-600 space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
              <CheckCircle size={16} />
              AI Analysis Run #{result.analysis_run_id} Completed Successfully
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-navy-800 rounded-lg p-3">
                <span className="text-slate-400 block">Total Analyzed:</span>
                <span className="text-xl font-bold text-slate-100">{result.total_observations}</span>
              </div>
              <div className="bg-navy-800 rounded-lg p-3">
                <span className="text-slate-400 block">Anomalies Detected:</span>
                <span className="text-xl font-bold text-red-400">{result.anomalies_detected}</span>
              </div>
              <div className="bg-navy-800 rounded-lg p-3">
                <span className="text-slate-400 block">Locations Assessed:</span>
                <span className="text-xl font-bold text-cyan-400">{result.locations_assessed}</span>
              </div>
              <div className="bg-navy-800 rounded-lg p-3">
                <span className="text-slate-400 block">Alerts Generated:</span>
                <span className="text-xl font-bold text-orange-400">{result.alerts_created}</span>
              </div>
            </div>

            {/* Model Details */}
            <div className="bg-navy-800/80 rounded-lg p-3 text-xs text-slate-300 space-y-1">
              <div><b>Model Architecture:</b> {result.model_type} (100 Estimators)</div>
              <div><b>Feature Vector:</b> {Array.isArray(result.features_used) ? result.features_used.join(', ') : String(result.features_used || 'displacement_mm, velocity, rainfall, mining_index')}</div>
            </div>

            {/* Anomalies Table */}
            {anomalies.length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Detected Anomaly Details ({anomalies.filter(a => a.is_anomaly).length} Outliers)
                </div>
                <div className="overflow-x-auto border border-navy-600 rounded-lg max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-navy-800 sticky top-0 text-slate-400 border-b border-navy-600">
                      <tr>
                        <th className="p-2">Latitude</th>
                        <th className="p-2">Longitude</th>
                        <th className="p-2">Anomaly Score</th>
                        <th className="p-2">Classification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-600/60 font-mono">
                      {anomalies.slice(0, 50).map((a, i) => (
                        <tr key={i} className={a.is_anomaly ? 'bg-red-500/10' : 'hover:bg-navy-800/30'}>
                          <td className="p-2">{a.latitude?.toFixed(4)}</td>
                          <td className="p-2">{a.longitude?.toFixed(4)}</td>
                          <td className="p-2 font-bold text-cyan-400">
                            {typeof a.anomaly_score === 'number' ? a.anomaly_score.toFixed(4) : '—'}
                          </td>
                          <td className="p-2">
                            {a.is_anomaly ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                                ANOMALY
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                                NORMAL
                              </span>
                            )}
                          </td>
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

      {/* Historical Analysis Runs */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <History size={18} className="text-cyan-400" />
          <h2 className="section-title text-base mb-0">Analysis Execution History</h2>
        </div>

        {loadingHistory ? (
          <div className="py-6 flex justify-center">
            <LoadingSpinner label="Loading history..." />
          </div>
        ) : historyRuns.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">No analysis runs recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-navy-600 text-slate-400">
                <tr>
                  <th className="pb-2">Run ID</th>
                  <th className="pb-2">Dataset</th>
                  <th className="pb-2">Model</th>
                  <th className="pb-2">Observations</th>
                  <th className="pb-2">Anomalies</th>
                  <th className="pb-2">Contamination</th>
                  <th className="pb-2">Executed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-600/40">
                {historyRuns.map(run => (
                  <tr key={run.id} className="hover:bg-navy-800/40">
                    <td className="py-2.5 font-mono text-cyan-400">#{run.id}</td>
                    <td className="py-2.5 text-slate-300">Dataset #{run.dataset_id}</td>
                    <td className="py-2.5 font-mono text-slate-400">{run.model_type}</td>
                    <td className="py-2.5 text-slate-200">{run.total_observations}</td>
                    <td className="py-2.5 font-bold text-red-400">{run.anomalies_detected}</td>
                    <td className="py-2.5 font-mono text-slate-400">{((run.contamination_param || 0) * 100).toFixed(0)}%</td>
                    <td className="py-2.5 text-slate-400">
                      {run.run_at ? new Date(run.run_at).toLocaleString() : '—'}
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
