import React, { useState, useEffect } from 'react'
import {
  Bell, AlertTriangle, ShieldAlert, CheckCircle2, Clock,
  Filter, Search, User, Edit3, X, RefreshCw
} from 'lucide-react'
import { alertAPI } from '../services/api'
import RiskBadge from '../components/ui/RiskBadge'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [riskFilter, setRiskFilter] = useState('ALL')
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [editStatus, setEditStatus] = useState('')
  const [editAnalyst, setEditAnalyst] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const loadAlerts = async () => {
    try {
      const res = await alertAPI.list()
      setAlerts(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
  }, [])

  const handleOpenAlert = (alert) => {
    setSelectedAlert(alert)
    setEditStatus(alert.status)
    setEditAnalyst(alert.assigned_analyst || '')
    setSuccessMsg('')
  }

  const handleUpdateAlert = async (e) => {
    e.preventDefault()
    if (!selectedAlert) return

    setUpdating(true)
    try {
      const res = await alertAPI.update(selectedAlert.id, {
        status: editStatus,
        assigned_analyst: editAnalyst,
      })
      // Update local alerts array
      setAlerts(prev => prev.map(a => a.id === selectedAlert.id ? res.data : a))
      setSelectedAlert(res.data)
      setSuccessMsg('Alert status successfully updated!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setUpdating(false)
    }
  }

  const filteredAlerts = alerts.filter(a => {
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false
    if (riskFilter !== 'ALL' && a.risk_level !== riskFilter) return false
    return true
  })

  const countByStatus = {
    ALL: alerts.length,
    NEW: alerts.filter(a => a.status === 'NEW').length,
    UNDER_REVIEW: alerts.filter(a => a.status === 'UNDER_REVIEW').length,
    RESOLVED: alerts.filter(a => a.status === 'RESOLVED').length,
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Disaster Prevention & Geotechnical Alerts</h1>
          <p className="text-slate-400 text-sm mt-1">
            Automated anomaly threshold triggers, review dispatching, and audit workflow tracking.
          </p>
        </div>
        <button
          onClick={loadAlerts}
          className="btn-secondary flex items-center gap-2 text-xs self-start sm:self-auto"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Tabs by Status */}
      <div className="flex flex-wrap items-center gap-2 border-b border-navy-600 pb-3">
        {['ALL', 'NEW', 'UNDER_REVIEW', 'RESOLVED'].map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
              statusFilter === st
                ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/30'
                : 'bg-navy-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{st.replace('_', ' ')}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              statusFilter === st ? 'bg-navy-900/40 text-white' : 'bg-navy-800 text-slate-400'
            }`}>
              {countByStatus[st] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Alerts Grid */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner label="Loading alerts..." />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="card text-center py-12 text-slate-500 text-sm">
          No alerts found under current status filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAlerts.map(alert => (
            <div
              key={alert.id}
              onClick={() => handleOpenAlert(alert)}
              className="card hover:border-cyan-500/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-black/40 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <RiskBadge level={alert.risk_level} />
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    alert.status === 'NEW' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    alert.status === 'UNDER_REVIEW' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                    'bg-green-500/20 text-green-400 border border-green-500/30'
                  }`}>
                    {alert.status.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-100 line-clamp-1">{alert.title}</h3>
                <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  {alert.description}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-navy-600/60 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {alert.created_at ? new Date(alert.created_at).toLocaleDateString() : 'Recent'}
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <User size={12} />
                  {alert.assigned_analyst || 'Unassigned'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alert Inspection & Update Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-800 border border-navy-500 rounded-xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedAlert(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-navy-700"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <RiskBadge level={selectedAlert.risk_level} />
              <span className="font-mono text-xs text-slate-400">Alert #{selectedAlert.id}</span>
            </div>

            <h2 className="text-lg font-bold text-slate-100 mb-2">{selectedAlert.title}</h2>
            <p className="text-xs text-slate-300 bg-navy-900/80 p-3 rounded-lg border border-navy-700 leading-relaxed mb-4">
              {selectedAlert.description}
            </p>

            <form onSubmit={handleUpdateAlert} className="space-y-4 text-xs">
              <div>
                <label className="label">Workflow Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="input text-xs"
                >
                  <option value="NEW">NEW (Action Pending)</option>
                  <option value="UNDER_REVIEW">UNDER REVIEW (Geologist Dispatched)</option>
                  <option value="RESOLVED">RESOLVED (Audit Closed)</option>
                </select>
              </div>

              <div>
                <label className="label">Assigned Field / Remote Analyst</label>
                <input
                  type="text"
                  value={editAnalyst}
                  onChange={(e) => setEditAnalyst(e.target.value)}
                  placeholder="e.g. Dr. A. Sharma (DGMS InSAR Team)"
                  className="input text-xs"
                />
              </div>

              {successMsg && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg p-2 text-xs flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  {successMsg}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-navy-600">
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="btn-secondary text-xs"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  {updating ? <RefreshCw size={12} className="animate-spin" /> : <Edit3 size={12} />}
                  Update Alert Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
