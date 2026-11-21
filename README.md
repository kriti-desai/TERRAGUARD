# TERRAGUARD 🛡️
### AI-Powered Underground Land Stability & Subsidence Risk Intelligence Platform
> **Predict. Monitor. Protect.**

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC)
![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-Isolation--Forest-F7931E)

---

## 🌍 Overview

**TERRAGUARD** is an enterprise-grade geospatial intelligence software platform designed to identify, analyze, and estimate underground mining-induced land subsidence hazards. 

Built specifically for mining regulatory bodies (such as DGMS in India), geotechnical engineering consultancies, environmental researchers, and disaster management agencies, TERRAGUARD transforms complex geodetic time-series into actionable, explainable risk intelligence.

---

## 🌟 Key Functional Modules

1. **🛰️ Satellite & Telemetry Data Management:**
   - Ingestion of CSV and GeoJSON georeferenced deformation observations.
   - Built-in validation of coordinates (WGS84), missing values, kinematics, and environmental parameters.
   - Bundled realistic Indian mining belt demonstration dataset (Jharkhand & Odisha coalfields).

2. **🤖 Unsupervised AI Anomaly Detection:**
   - Real **Isolation Forest** pipeline built with `scikit-learn`.
   - Feature engineering with feature scaling and median imputation.
   - Outlier isolation across multi-dimensional feature vectors (displacement, velocity, rainfall, mining proximity).

3. **📊 Explainable Subsidence Risk Index:**
   - Transparent, auditable multi-factor risk scoring (0–100 index).
   - Categorization into `LOW`, `MODERATE`, `ELEVATED`, and `HIGH` risk zones.
   - Granular decomposition of contributing factors (Displacement: 30 pts, Velocity: 25 pts, Rainfall: 15 pts, Mining Intensity: 15 pts, ML Outlier: 15 pts).

4. **🗺️ Interactive Geospatial Risk Map:**
   - Powered by React Leaflet with OpenStreetMap tiles.
   - Real-time risk level filtering, color-coded circle markers, and detailed geodetic popups.
   - Drawer inspection with live risk score gauges and direct links to historical trends.

5. **📈 Historical Ground Kinematics Analysis:**
   - Interactive Recharts visualization tracking vertical displacement (mm) over time.
   - Comparative analytics between multiple mining zones.
   - Observation archives recording temporal subsidence velocity (mm/year).

6. **🏔️ 3D Terrain & Topography Visualizer:**
   - 3D interactive surface rendering using Plotly.js.
   - Visualizes terrain elevation bowls and surface mining troughs with rotational and zoom control.

7. **🚨 Disaster Prevention Alert Workflow:**
   - Automated generation of alerts when `HIGH` or `ELEVATED` risk thresholds are crossed.
   - Duplicate alert prevention.
   - Full review workflow: `NEW` ➔ `UNDER_REVIEW` ➔ `RESOLVED` with analyst assignment.

8. **📄 Publication-Grade PDF Audit Reports:**
   - Server-side PDF generation using ReportLab.
   - Includes formal branding, location profile tables, risk breakdown matrices, and regulatory disclaimers.

---

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Leaflet, Recharts, Plotly.js, Lucide Icons, Axios.
- **Backend:** Python 3.10+, FastAPI, SQLAlchemy, Pydantic v2, Python-Jose (JWT), Passlib (Bcrypt).
- **Machine Learning & Geospatial:** Scikit-learn (Isolation Forest), NumPy, Pandas, ReportLab.
- **Database:** SQLite (local development) / PostgreSQL with PostGIS compatibility for deployment.

---

## 🚀 Quick Start Guide

### 1. Start the FastAPI Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed database with demo admin, analyst, sample observations, and initial ML run
python seed.py

# Launch server
uvicorn app.main:app --reload --port 8000
```
Backend API will be running at `http://localhost:8000`.  
Swagger documentation available at `http://localhost:8000/docs`.

### 2. Start the React Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Frontend application will be accessible at `http://localhost:5173`.

---

## 🧪 Automated Testing & Verification

TERRAGUARD includes a comprehensive automated test suite covering authentication, ORM database persistence, machine learning isolation forest pipelines, multi-factor risk scoring, dataset parsing/upload validation, and all core REST API endpoints:

```bash
# Windows (PowerShell):
$env:PYTHONPATH="backend"; pytest backend/tests -v

# Linux / macOS (Bash):
PYTHONPATH=backend pytest backend/tests -v
```

All 25 test cases pass against an isolated in-memory SQLite engine:
- **Authentication & RBAC (`test_auth.py`):** 9 tests (registration, login, public Admin 403 rejection, case-insensitive duplicate email handling, `/auth/me`).
- **Database ORM (`test_database.py`):** 3 tests (user models, foreign key relationships, risk-alert workflows).
- **Machine Learning & Risk (`test_ml_and_risk.py`):** 3 tests (feature engineering, Isolation Forest outlier scoring, explainable multi-factor formula).
- **Datasets & Ingestion (`test_datasets.py`):** 5 tests (CSV parser, column validation, 50MB limits, empty file checks, sample download).
- **Core API Endpoints (`test_api_endpoints.py`):** 5 tests (health, summary dashboard, observation history, alerts lifecycle, PDF report generation & download).

### Frontend Production Build & Code Splitting

```bash
cd frontend
npm run build
```
Optimized chunk splitting isolates heavy geospatial/plotting libraries (`plotly-vendor`, `leaflet-vendor`, `charts-vendor`, `react-vendor`) and lazy-loads all routes with `React.lazy()` and `Suspense`.

---

## 🔒 Security Architecture

1. **Role-Based Access Control (RBAC):**
   - Public self-registration is strictly restricted to `analyst` accounts.
   - Any API request attempting to self-provision the `admin` role is rejected with HTTP `403 Forbidden`.
   - Admin-only routes (e.g. running machine learning models, modifying sensitive datasets) require explicit `require_admin` dependency checks.
2. **Password Security:**
   - Cryptographically hashed using industry-standard `bcrypt` with unique salt generation.
   - Plaintext passwords are never stored or logged.
3. **JWT Authentication:**
   - Signed JSON Web Tokens (HS256) with configurable expiration (default: 24 hours).
   - Bearer token authentication required on all operational endpoints.
4. **CORS Hardening:**
   - Configurable allowed origins via `CORS_ORIGINS` environment variable.
5. **Upload Validation:**
   - Strict file type (CSV/GeoJSON), file size (50MB maximum), empty file rejection, and path-traversal prevention.

---

## ☁️ Cloud Deployment

- **Frontend (Vercel):** Pre-configured via `vercel.json` with client-side SPA route rewrites.
- **Backend (Render / Railway / Heroku):** Pre-configured via `render.yaml` Blueprint and `backend/Procfile`.
- Full walkthrough available in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## 🔐 Demonstration Credentials

Demo accounts are created by the database seeder for local development.

For security, configure your own credentials before running the application. Never use default demonstration credentials in production.

---

## 🔬 Scientific & Regulatory Disclaimers

> **IMPORTANT SCIENTIFIC INTEGRITY NOTE:**  
> - **Provisional Nature of Estimates:** TERRAGUARD provides relative statistical anomaly scores and empirical risk indices. It does **not** claim to provide deterministic guarantees of mine collapse or land subsidence.
> - **InSAR Nuances:** Downloading a raw Sentinel-1 radar image does not automatically output millimeters of displacement; specialized interferometric processing (e.g. StaMPS, MintPy, LiCSAR) is required.
> - **Demonstration Data:** Bundled sample observations and the 3D terrain surface are clearly labeled as demonstration and research simulations.

---

## 📚 Documentation Links
- [REST API Reference](docs/API.md)
- [Geospatial & Satellite InSAR Data Architecture](docs/DATA_SOURCES.md)
- [Free-Tier Cloud Deployment Guide (Render + Vercel)](docs/DEPLOYMENT.md)
