# TERRAGUARD REST API Documentation

Base URL: `http://localhost:8000` (Local) / Production URL

Interactive Swagger UI documentation is available at:
- Swagger Docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## 1. Authentication Endpoints

### Register User
- **POST** `/auth/register`
- **Body:**
  ```json
  {
    "email": "user@terraguard.in",
    "full_name": "Dr. Analyst",
    "password": "Password@123",
    "role": "analyst"
  }
  ```
- **Security Rule:** Public registration is restricted to `analyst` accounts only. Requesting `role: "admin"` returns HTTP `403 Forbidden` to prevent unauthorized administrative escalation. Admin accounts must be created directly by an existing administrator.
- **Response:**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "email": "user@terraguard.in",
      "full_name": "Dr. Analyst",
      "role": "analyst",
      "is_active": true
    }
  }
  ```

### Login
- **POST** `/auth/login`
- **Body:**
  ```json
  {
    "email": "admin@terraguard.in",
    "password": "Admin@123"
  }
  ```
- **Response:** Returns JWT `access_token` and user profile.

### Current User Profile
- **GET** `/auth/me`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Returns currently authenticated user object.

---

## 2. Dashboard Endpoints

### Summary KPI Metrics
- **GET** `/dashboard/summary`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Total locations, counts for HIGH/ELEVATED/MODERATE/LOW risks, anomalies detected, processed datasets.

### Risk Distribution
- **GET** `/dashboard/risk-distribution`
- **Response:** Array of `{ "risk_level": "HIGH", "count": 3 }`.

### Recent Activity
- **GET** `/dashboard/recent-activity`
- **Response:** List of latest alerts and executed ML runs.

---

## 3. Dataset Management

### Upload Dataset
- **POST** `/datasets/upload`
- **Type:** Multipart form-data (`file: [CSV or GeoJSON]`)
- **Response:** Ingestion summary, column verification, preview of first 5 rows.

### List Datasets
- **GET** `/datasets`
- **Response:** List of stored geodetic datasets with record counts and processing state.

### Download Sample Dataset
- **GET** `/datasets/sample/download`
- **Response:** Streams `terraguard_sample_observations.csv`.

---

## 4. Machine Learning & Anomaly Detection

### Execute ML Pipeline
- **POST** `/analysis/run`
- **Body:**
  ```json
  {
    "dataset_id": 1,
    "contamination": 0.12
  }
  ```
- **Workflow:**
  1. Standardizes deformation, velocity, rainfall, elevation, mining proximity.
  2. Trains Isolation Forest outlier detector (100 estimators).
  3. Executes multi-factor risk assessment index per location.
  4. Generates deduplicated alerts for ELEVATED and HIGH zones.

### Analysis Run History
- **GET** `/analysis/history`

### Anomaly Points Query
- **GET** `/analysis/{id}/anomalies?anomalies_only=true`

---

## 5. Geospatial Risk & 3D Terrain

### Monitored Risk Locations
- **GET** `/risk/locations`
- **Response:** All locations combined with their latest risk classification and coordinates.

### Single Location Profile & Risk
- **GET** `/risk/{location_id}`
- **Response:** Location metadata combined with its latest risk assessment.

### Location Historical Risk Assessments
- **GET** `/risk/{location_id}/history`
- **Response:** Chronological list of historical risk assessments for the specified location.

### Observed Physical Kinematic Measurements
- **GET** `/risk/{location_id}/observations`
- **Response:** Chronological series of observed real physical measurements (displacement in mm, velocity in mm/yr, rainfall, elevation, mining proximity index).

### 3D Topographic Terrain Surface
- **GET** `/risk/terrain`
- **Response:** 2D elevation matrix `z`, longitude grid `x`, latitude grid `y`.

---

## 6. Alerts & Audit Workflow

### List Alerts
- **GET** `/alerts?status=NEW&risk_level=HIGH`
- **Response:** List of system alerts filtered by status or risk severity.

### Create Manual Alert
- **POST** `/alerts`
- **Body:**
  ```json
  {
    "location_id": 1,
    "risk_level": "ELEVATED",
    "title": "Unusual subsidence acceleration",
    "description": "Velocity jumped from -5mm/yr to -25mm/yr in 30 days.",
    "displacement_mm": -25.0
  }
  ```
- **Response:** Created alert object.

### Update Alert
- **PATCH** `/alerts/{id}`
- **Body:**
  ```json
  {
    "status": "UNDER_REVIEW",
    "assigned_analyst": "Dr. Sharma"
  }
  ```

---

## 7. Reports & Certification

### Generate ReportLab PDF
- **POST** `/reports/generate`
- **Body:**
  ```json
  {
    "location_id": 1,
    "analysis_run_id": 1
  }
  ```
- **Response:** Created report metadata record.

### List Reports
- **GET** `/reports`
- **Response:** List of all compiled PDF reports with author, timestamp and download path.

### Download Compiled PDF
- **GET** `/reports/{id}/download`
- **Response:** Streams formatted, publication-grade `.pdf` binary.
