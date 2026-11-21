/**
 * Topbar.jsx — Top navigation bar showing page title, datetime, alerts, user info.
 */
import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../../context/AuthContext'
import { alertAPI } from '../../services/api'

// Map route segments to human-readable titles
const PAGE_TITLES = {
  dashboard: 'Dashboard',
  map: 'Risk Map',
  datasets: 'Dataset Management',
  analysis: 'AI Analysis',
  risk: 'Risk Assessment',
  history: 'Historical Trends',
  terrain: '3D Terrain Viewer',
  alerts: 'Alert Center',
  reports: 'Reports',
}

export default function Topbar() {
  const { user } = useAuth()
  const location = useLocation()
  const [now, setNow] = useState(new Date())
  const [alertCount, setAlertCount] = useState(0)

  // Tick clock every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Fetch new alert count
  useEffect(() => {
    alertAPI.list({ status: 'NEW' })
      .then(res => {
        const data = res.data
        // Backend may return an array or { items: [], total: n }
        const count = Array.isArray(data) ? data.length : (data.total ?? data.items?.length ?? 0)
        setAlertCount(count)
      })
      .catch(() => setAlertCount(0))
  }, [location.pathname])

  // Derive page title from route
  const segment = location.pathname.split('/').filter(Boolean).pop()
  const pageTitle = PAGE_TITLES[segment] || 'TERRAGUARD'

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-navy-900 border-b border-navy-600 flex-shrink-0">
      {/* Page title */}
      <div>
        <h1 className="text-slate-100 font-semibold text-base">{pageTitle}</h1>
        <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-0.5">
          <Clock size={11} />
          <span>{format(now, 'EEEE, dd MMM yyyy · HH:mm')}</span>
        </div>
      </div>

      {/* Right: alerts + user */}
      <div className="flex items-center gap-4">
        {/* Alert bell with badge */}
        <div className="relative">
          <Bell size={18} className="text-slate-400 hover:text-cyan-400 cursor-pointer transition-colors" />
          {alertCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </div>

        {/* User info */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-xs font-bold">
            {initials}
          </div>
          <div className="hidden sm:block">
            <div className="text-slate-200 text-sm font-medium leading-none">{user?.full_name || 'User'}</div>
            <div className="text-slate-500 text-xs capitalize mt-0.5">{user?.role || 'analyst'}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
