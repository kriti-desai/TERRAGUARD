/**
 * LandingPage.jsx — Public-facing marketing page for TERRAGUARD.
 * No authentication required. Showcases the platform's value proposition.
 */
import React from 'react'
import { Link } from 'react-router-dom'
import {
  Shield, Map, Brain, Bell, FileText, Database,
  Mountain, AlertTriangle, TrendingDown, Globe,
  ArrowRight, CheckCircle, Zap, Eye, BarChart3
} from 'lucide-react'

// ─── Sub-components ──────────────────────────────────────────────────────────

function TopNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-900/95 backdrop-blur border-b border-navy-600">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
            <path d="M16 2L4 7v9c0 7 5.3 13.5 12 15 6.7-1.5 12-8 12-15V7L16 2z"
              fill="#00b4d8" fillOpacity="0.2" stroke="#00b4d8" strokeWidth="1.5" />
            <path d="M11 16l3 3 7-7" stroke="#00b4d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-cyan-400 font-bold text-lg tracking-wider">TERRAGUARD</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-secondary">Login</Link>
          <Link to="/register" className="btn-primary flex items-center gap-1.5">
            Get Started <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </nav>
  )
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900" />
      {/* Decorative radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/25 rounded-full px-4 py-1.5 mb-6">
          <Zap size={13} className="text-cyan-400" />
          <span className="text-cyan-400 text-sm font-medium">AI-Powered Land Stability Intelligence</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-slate-100 leading-tight mb-6">
          TERRA<span className="text-cyan-400">GUARD</span>
        </h1>
        <p className="text-xl md:text-2xl text-slate-300 font-light mb-3">
          Predict. Monitor. Protect.
        </p>
        <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Advanced machine learning platform for detecting ground subsidence, mine collapse risk,
          and land deformation — before disaster strikes.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register" className="btn-primary text-base px-8 py-3 flex items-center justify-center gap-2">
            Start Monitoring <ArrowRight size={16} />
          </Link>
          <Link to="/login" className="btn-secondary text-base px-8 py-3">
            Sign In to Dashboard
          </Link>
        </div>

        {/* Hero stat strip */}
        <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
          {[
            { val: 'Unsupervised', label: 'Isolation Forest AI' },
            { val: 'Multi-Factor', label: 'Kinematic Risk Index' },
            { val: 'Automated', label: 'Early Alert System' },
          ].map(({ val, label }) => (
            <div key={label} className="text-center">
              <div className="text-cyan-400 font-bold text-2xl">{val}</div>
              <div className="text-slate-500 text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-5 h-8 border-2 border-slate-600 rounded-full flex justify-center pt-1.5">
          <div className="w-1 h-2 bg-cyan-400 rounded-full" />
        </div>
      </div>
    </section>
  )
}

function ProblemSection() {
  const stats = [
    { icon: AlertTriangle, value: '12,000+', label: 'Mine Collapses', sub: 'reported globally per year', color: 'text-red-400' },
    { icon: TrendingDown,  value: '50M+',    label: 'Hectares Affected', sub: 'by land subsidence annually', color: 'text-orange-400' },
    { icon: Globe,         value: '72 hours', label: 'Average Warning Gap', sub: 'between detection and disaster', color: 'text-yellow-400' },
  ]
  return (
    <section className="py-24 bg-navy-800">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4">The Problem Is Real</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Ground subsidence and mine collapses cause billions in damage and thousands of casualties every year.
            Traditional monitoring is too slow and manual.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map(({ icon: Icon, value, label, sub, color }) => (
            <div key={label} className="card text-center">
              <Icon size={36} className={`${color} mx-auto mb-4`} />
              <div className={`text-4xl font-black ${color} mb-2`}>{value}</div>
              <div className="text-slate-200 font-semibold text-lg">{label}</div>
              <div className="text-slate-500 text-sm mt-1">{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  const steps = [
    { n: '01', icon: Database,  title: 'Upload Data',         desc: 'Upload InSAR, GPS, or manual displacement CSV data with geographic coordinates.' },
    { n: '02', icon: Brain,     title: 'AI Processing',       desc: 'Isolation Forest algorithm analyzes spatial patterns and detects anomalous ground movement.' },
    { n: '03', icon: Shield,    title: 'Risk Scoring',        desc: 'Locations receive HIGH / ELEVATED / MODERATE / LOW risk classifications automatically.' },
    { n: '04', icon: Bell,      title: 'Instant Alerts',      desc: 'System generates alerts for high-risk locations and notifies assigned analysts.' },
    { n: '05', icon: FileText,  title: 'PDF Reports',         desc: 'Generate comprehensive PDF reports with risk maps, charts, and recommendations.' },
  ]
  return (
    <section className="py-24 bg-navy-900">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4">How It Works</h2>
          <p className="text-slate-400 text-lg">Five steps from raw data to actionable intelligence</p>
        </div>
        <div className="relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-10 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-cyan-500/0 via-cyan-500/40 to-cyan-500/0" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {steps.map(({ n, icon: Icon, title, desc }) => (
              <div key={n} className="flex flex-col items-center text-center">
                <div className="relative z-10 w-20 h-20 rounded-full bg-navy-700 border-2 border-cyan-500/30 flex items-center justify-center mb-4">
                  <Icon size={28} className="text-cyan-400" />
                  <span className="absolute -top-1 -right-1 bg-cyan-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {n.slice(1)}
                  </span>
                </div>
                <div className="text-slate-100 font-semibold mb-2">{title}</div>
                <div className="text-slate-400 text-sm leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  const features = [
    { icon: Brain,    title: 'Isolation Forest AI',   desc: 'Unsupervised anomaly detection trained on displacement patterns. No labeled data required.', accent: 'cyan' },
    { icon: Map,      title: 'Interactive Risk Map',  desc: 'Real-time Leaflet map with color-coded risk markers, popups, and location-level filtering.', accent: 'blue' },
    { icon: Mountain, title: '3D Terrain Viewer',     desc: 'Plotly-powered 3D surface visualization of terrain with risk site overlays.', accent: 'purple' },
    { icon: Bell,     title: 'Smart Alerts',          desc: 'Automated alert generation with status tracking, analyst assignment, and history.', accent: 'orange' },
    { icon: FileText, title: 'PDF Report Generator',  desc: 'Generate downloadable reports with risk summaries, charts, and site analysis.', accent: 'green' },
    { icon: Database, title: 'Data Management',       desc: 'Upload CSV/GeoJSON datasets, validate coordinates, preview data, and manage history.', accent: 'yellow' },
  ]

  const accentMap = {
    cyan:   'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    blue:   'bg-blue-500/10 border-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    green:  'bg-green-500/10 border-green-500/20 text-green-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  }

  return (
    <section className="py-24 bg-navy-800">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4">Platform Features</h2>
          <p className="text-slate-400 text-lg">Everything you need for professional land stability monitoring</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc, accent }) => (
            <div key={title} className="card hover:border-navy-500 transition-colors">
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${accentMap[accent]}`}>
                <Icon size={22} />
              </div>
              <div className="text-slate-100 font-semibold mb-2">{title}</div>
              <div className="text-slate-400 text-sm leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TechSection() {
  const tech = ['React 18', 'Vite', 'Tailwind CSS', 'Recharts', 'Plotly.js', 'React Leaflet', 'FastAPI', 'scikit-learn', 'PostgreSQL']
  return (
    <section className="py-16 bg-navy-900 border-t border-navy-600">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="text-slate-500 text-sm uppercase tracking-widest mb-6">Built With</div>
        <div className="flex flex-wrap justify-center gap-3">
          {tech.map(t => (
            <span key={t} className="bg-navy-700 border border-navy-600 text-slate-400 text-xs px-3 py-1.5 rounded-full">
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="py-24 bg-navy-800">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <div className="card border-cyan-500/20 py-12">
          <Shield size={48} className="text-cyan-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-slate-100 mb-4">Ready to Protect What Matters?</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Join geoscientists and risk analysts using TERRAGUARD to monitor ground stability
            and prevent disasters before they happen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary text-base px-8 py-3 flex items-center justify-center gap-2">
              Create Free Account <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn-secondary text-base px-8 py-3">
              Sign In
            </Link>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-slate-500 text-sm">
            <CheckCircle size={14} className="text-green-400" />
            <span>Free for research use · No credit card required</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-navy-900 border-t border-navy-600 py-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <path d="M16 2L4 7v9c0 7 5.3 13.5 12 15 6.7-1.5 12-8 12-15V7L16 2z"
                fill="#00b4d8" fillOpacity="0.15" stroke="#00b4d8" strokeWidth="1.5" />
              <path d="M11 16l3 3 7-7" stroke="#00b4d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-cyan-400 font-bold text-sm tracking-wider">TERRAGUARD</span>
          </div>
          <p className="text-slate-500 text-xs text-center max-w-xl">
            ⚠ For research and monitoring purposes only. Not a substitute for professional geological assessment,
            on-site survey, or emergency response decisions. Always consult a qualified geotechnical engineer.
          </p>
          <div className="text-slate-600 text-xs">© 2024 TERRAGUARD</div>
        </div>
      </div>
    </footer>
  )
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-navy-900">
      <TopNav />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <TechSection />
      <CTASection />
      <Footer />
    </div>
  )
}
