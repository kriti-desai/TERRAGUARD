/**
 * App.jsx — Root component: lazy-loaded routing + auth provider setup.
 */
import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'

// Lazy-loaded page components for route-level code splitting
const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const MapPage = lazy(() => import('./pages/MapPage'))
const DatasetPage = lazy(() => import('./pages/DatasetPage'))
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'))
const RiskPage = lazy(() => import('./pages/RiskPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const Terrain3DPage = lazy(() => import('./pages/Terrain3DPage'))
const AlertsPage = lazy(() => import('./pages/AlertsPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))

/** Fallback loader during code-split chunk resolution */
function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-cyan-400 text-xs font-mono uppercase tracking-widest">Loading Module...</div>
      </div>
    </div>
  )
}

/** Wraps routes that require authentication */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-navy-800">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-cyan-400 text-sm font-medium tracking-widest uppercase">Loading TERRAGUARD...</div>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="datasets" element={<DatasetPage />} />
          <Route path="analysis" element={<AnalysisPage />} />
          <Route path="risk" element={<RiskPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="terrain" element={<Terrain3DPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
