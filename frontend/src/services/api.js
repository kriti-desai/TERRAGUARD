/**
 * api.js — Axios-based API service for TERRAGUARD
 * All backend communication goes through this module.
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: BASE_URL, timeout: 30000 })

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tg_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401 Unauthorized (except for /auth/login itself so login errors display)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginReq = err.config?.url?.includes('/auth/login')
    if (err.response?.status === 401 && !isLoginReq) {
      localStorage.removeItem('tg_token')
      localStorage.removeItem('tg_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// ─── AUTH ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
export const dashboardAPI = {
  summary: () => api.get('/dashboard/summary'),
  riskDistribution: () => api.get('/dashboard/risk-distribution'),
  recentActivity: () => api.get('/dashboard/recent-activity'),
}

// ─── DATASETS ────────────────────────────────────────────────────────────────
export const datasetAPI = {
  upload: (formData) => api.post('/datasets/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  list: () => api.get('/datasets'),
  get: (id) => api.get(`/datasets/${id}`),
  process: (id) => api.post(`/datasets/${id}/process`),
  downloadSample: () => api.get('/datasets/sample/download', { responseType: 'blob' }),
}

// ─── ANALYSIS ────────────────────────────────────────────────────────────────
export const analysisAPI = {
  run: (data) => api.post('/analysis/run', data),
  history: () => api.get('/analysis/history'),
  get: (id) => api.get(`/analysis/${id}`),
  anomalies: (id) => api.get(`/analysis/${id}/anomalies`),
}

// ─── RISK ─────────────────────────────────────────────────────────────────────
export const riskAPI = {
  locations: () => api.get('/risk/locations'),
  get: (id) => api.get(`/risk/${id}`),
  history: (id) => api.get(`/risk/${id}/history`),
  observations: (id) => api.get(`/risk/${id}/observations`),
  terrain: () => api.get('/risk/terrain'),
}

// ─── ALERTS ──────────────────────────────────────────────────────────────────
export const alertAPI = {
  list: (params) => api.get('/alerts', { params }),
  create: (data) => api.post('/alerts', data),
  get: (id) => api.get(`/alerts/${id}`),
  update: (id, data) => api.patch(`/alerts/${id}`, data),
}

// ─── REPORTS ─────────────────────────────────────────────────────────────────
export const reportAPI = {
  generate: (data) => api.post('/reports/generate', data),
  download: (id) => api.get(`/reports/${id}/download`, { responseType: 'blob' }),
  list: () => api.get('/reports'),
}

export default api
