/**
 * Sidebar.jsx — Collapsible navigation sidebar.
 * Collapsed: icons only. Expanded: icons + labels.
 */
import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Map, Database, Brain, Shield,
  BarChart3, Mountain, Bell, FileText, LogOut,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/map',       icon: Map,             label: 'Risk Map' },
  { to: '/app/datasets',  icon: Database,        label: 'Datasets' },
  { to: '/app/analysis',  icon: Brain,           label: 'AI Analysis' },
  { to: '/app/risk',      icon: Shield,          label: 'Risk Assessment' },
  { to: '/app/history',   icon: BarChart3,       label: 'History' },
  { to: '/app/terrain',   icon: Mountain,        label: '3D Terrain' },
  { to: '/app/alerts',    icon: Bell,            label: 'Alerts' },
  { to: '/app/reports',   icon: FileText,        label: 'Reports' },
]

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // User initials for avatar
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <aside
      className={`flex flex-col bg-navy-900 border-r border-navy-600 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-60'
      } flex-shrink-0`}
    >
      {/* ── Logo ── */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-navy-600 ${collapsed ? 'justify-center' : ''}`}>
        {/* Shield SVG icon */}
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="flex-shrink-0">
          <path
            d="M16 2L4 7v9c0 7 5.3 13.5 12 15 6.7-1.5 12-8 12-15V7L16 2z"
            fill="#00b4d8" fillOpacity="0.15" stroke="#00b4d8" strokeWidth="1.5"
          />
          <path
            d="M11 16l3 3 7-7"
            stroke="#00b4d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
        {!collapsed && (
          <div>
            <div className="text-cyan-400 font-bold text-base tracking-wider">TERRAGUARD</div>
            <div className="text-slate-500 text-xs">Land Stability AI</div>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg mb-0.5 transition-all duration-150 group ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-navy-700'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'} />
                {!collapsed && (
                  <span className="text-sm font-medium">{label}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── User profile ── */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-navy-600">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-slate-200 text-sm font-medium truncate">{user?.full_name || 'User'}</div>
              <div className="text-slate-500 text-xs capitalize">{user?.role || 'analyst'}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      )}

      {collapsed && (
        <div className="px-2 py-3 border-t border-navy-600 flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-xs font-bold">
            {initials}
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}

      {/* ── Collapse toggle ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-3 border-t border-navy-600 text-slate-500 hover:text-cyan-400 transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  )
}
