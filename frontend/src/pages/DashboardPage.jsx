import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MapPin, AlertTriangle, ShieldAlert, ShieldCheck, Activity,
  Database, RefreshCw, ArrowRight, Eye, Play, Upload
} from 'lucide-react'
import { dashboardAPI, alertAPI } from '../services/api'
import StatCard from '../components/ui/StatCard'
import RiskBadge from '../components/ui/RiskBadge'
import RiskDistributionChart from '../components/charts/RiskDistributionChart'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function DashboardPage() {
  const [summary, setSummary] = useState(null)
  const [distribution, setDistribution] = useState([])
  const [recentAlerts, setRecentAlerts] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadDashboardData = async () => {
    try {
      const [sumRes, distRes, actRes, alertsRes] = await Promise.all([
        dashboardAPI.summary(),
        dashboardAPI.riskDistribution(),
        dashboardAPI.recentActivity(),
        alertAPI.list({ limit: 5 }),
      ])
      setSummary(sumRes.data)
      setDistribution(distRes.data)
      setRecentActivity(actRes.data)
      setRecentAlerts(alertsRes.data)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    loadDashboardData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <LoadingSpinner label="Loading TERRAGUARD Intelligence Dashboard..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-navy-700 border border-navy-600 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">Live Operational Status</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">Ground Stability Control Centre</h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time subsurface deformation tracking, ML anomaly detection, and early subsidence alerting.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2 text-xs"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link to="/app/analysis" className="btn-primary flex items-center gap-2 text-xs">
            <Play size={14} />
            Run AI Analysis
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          icon={MapPin}
          label="Monitored Sites"
          value={summary?.total_locations ?? 0}
          sub="Georeferenced nodes"
          accent="cyan"
        />
        <StatCard
          icon={ShieldAlert}
          label="High Risk"
          value={summary?.high_risk ?? 0}
          sub="Critical inspection"
          accent="red"
        />
        <StatCard
          icon={AlertTriangle}
          label="Elevated Risk"
          value={summary?.elevated_risk ?? 0}
          sub="Action required"
          accent="orange"
        />
        <StatCard
          icon={Activity}
          label="Moderate Risk"
          value={summary?.moderate_risk ?? 0}
          sub="Surveillance"
          accent="yellow"
        />
        <StatCard
          icon={ShieldCheck}
          label="Low / Stable"
          value={summary?.low_risk ?? 0}
          sub="Within tolerances"
          accent="green"
        />
        <StatCard
          icon={Activity}
          label="ML Anomalies"
          value={summary?.total_anomalies ?? 0}
          sub="Isolation Forest flags"
          accent="cyan"
        />
      </div>

      {/* Main Charts & Visual Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Chart */}
        <div className="card lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-title text-base">Risk Categorization</h2>
              <p className="text-xs text-slate-400">Current active site distribution</p>
            </div>
            <Link to="/app/risk" className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1">
              Details <ArrowRight size={12} />
            </Link>
          </div>
          <div className="h-64 flex items-center justify-center">
            <RiskDistributionChart data={distribution} />
          </div>
        </div>

        {/* Quick Action & Geospatial Highlights */}
        <div className="card lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="section-title text-base">Operational Quick Actions</h2>
                <p className="text-xs text-slate-400">Core geospatial intelligence pipelines</p>
              </div>
              <span className="text-xs text-slate-500">
                Latest Telemetry: {summary?.latest_analysis_date ? new Date(summary.latest_analysis_date).toLocaleDateString() : 'Active'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                to="/app/map"
                className="bg-navy-800/80 hover:bg-navy-600/50 border border-navy-600 rounded-xl p-4 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <MapPin size={18} />
                </div>
                <div className="text-sm font-semibold text-slate-200">Interactive Map</div>
                <div className="text-xs text-slate-400 mt-1">Explore deformation vectors across mining zones</div>
              </Link>

              <Link
                to="/app/datasets"
                className="bg-navy-800/80 hover:bg-navy-600/50 border border-navy-600 rounded-xl p-4 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Upload size={18} />
                </div>
                <div className="text-sm font-semibold text-slate-200">Data Ingestion</div>
                <div className="text-xs text-slate-400 mt-1">Upload CSV or GeoJSON radar deformation files</div>
              </Link>

              <Link
                to="/app/terrain"
                className="bg-navy-800/80 hover:bg-navy-600/50 border border-navy-600 rounded-xl p-4 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Eye size={18} />
                </div>
                <div className="text-sm font-semibold text-slate-200">3D Elevation Model</div>
                <div className="text-xs text-slate-400 mt-1">Inspect 3D subsidence troughs and elevation bowls</div>
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-navy-600/60 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-cyan-400" />
              <span>Processed InSAR Datasets: <b>{summary?.processed_datasets ?? 0}</b> / {summary?.total_datasets ?? 0}</span>
            </div>
            <Link to="/app/reports" className="text-cyan-400 hover:text-cyan-300 font-medium">
              Generate PDF Audit Reports &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Alerts & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Alerts */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-title text-base">Critical Deformation Alerts</h2>
              <p className="text-xs text-slate-400">Latest active alerts generated by risk assessment rules</p>
            </div>
            <Link to="/app/alerts" className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1">
              View All ({recentAlerts.length}) <ArrowRight size={12} />
            </Link>
          </div>

          {recentAlerts.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              No active alerts. Run AI Analysis or upload new dataset observations.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-navy-600 text-slate-400">
                    <th className="pb-2">Risk Level</th>
                    <th className="pb-2">Title</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Generated</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-600/40">
                  {recentAlerts.map(alert => (
                    <tr key={alert.id} className="hover:bg-navy-600/20 transition-colors">
                      <td className="py-2.5">
                        <RiskBadge level={alert.risk_level} />
                      </td>
                      <td className="py-2.5 font-medium text-slate-200 pr-2">
                        {alert.title}
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          alert.status === 'NEW' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          alert.status === 'UNDER_REVIEW' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                          'bg-green-500/20 text-green-400 border border-green-500/30'
                        }`}>
                          {alert.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-400">
                        {alert.created_at ? new Date(alert.created_at).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="py-2.5 text-right">
                        <Link to="/app/alerts" className="text-cyan-400 hover:text-cyan-300 text-xs">
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Activity Log */}
        <div className="card lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-title text-base">Pipeline Activity</h2>
              <p className="text-xs text-slate-400">Audit trail of analyses & triggers</p>
            </div>
            <Activity size={16} className="text-slate-400" />
          </div>

          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="text-slate-500 text-xs text-center py-8">No recent activity logged.</div>
            ) : (
              recentActivity.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs border-b border-navy-600/40 pb-2.5 last:border-0">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${item.type === 'alert' ? 'bg-red-400' : 'bg-cyan-400'}`} />
                  <div className="flex-1">
                    <div className="text-slate-200 font-medium">{item.description}</div>
                    <div className="text-slate-500 text-[10px] mt-0.5">
                      {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
