/**
 * LoginPage.jsx — Authentication page with email/password form.
 * Shows demo credentials for easy access.
 */
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, AlertCircle, Info } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/app/dashboard')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed. Check credentials.'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = () => {
    setForm({ email: 'admin@terraguard.in', password: 'Admin@123' })
    setError('')
  }

  return (
    <div className="min-h-screen bg-navy-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
              <path d="M16 2L4 7v9c0 7 5.3 13.5 12 15 6.7-1.5 12-8 12-15V7L16 2z"
                fill="#00b4d8" fillOpacity="0.2" stroke="#00b4d8" strokeWidth="1.5" />
              <path d="M11 16l3 3 7-7" stroke="#00b4d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-3xl font-black text-cyan-400 tracking-wider">TERRAGUARD</span>
          </div>
          <p className="text-slate-400 text-sm">Land Stability Intelligence Platform</p>
        </div>

        {/* Card */}
        <div className="card border-navy-600">
          <h2 className="text-xl font-bold text-slate-100 mb-6">Sign In</h2>

          {/* Demo credentials info */}
          <button
            type="button"
            onClick={fillDemo}
            className="w-full mb-5 p-3 bg-cyan-500/10 border border-cyan-500/25 rounded-lg flex items-start gap-2.5 text-left hover:bg-cyan-500/15 transition-colors"
          >
            <Info size={16} className="text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-cyan-400 text-xs font-semibold mb-0.5">Demo Credentials (click to fill)</div>
              <div className="text-slate-400 text-xs font-mono">admin@terraguard.in / Admin@123</div>
            </div>
          </button>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/25 rounded-lg flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="input"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
              ) : (
                <><LogIn size={16} /> Sign In</>
              )}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-6">
            No account?{' '}
            <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-medium">
              Create one
            </Link>
          </p>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          For research and monitoring purposes only.
        </p>
      </div>
    </div>
  )
}
