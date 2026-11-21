# TERRAGUARD Deployment Guide

This guide details deploying TERRAGUARD to free-tier cloud platforms:
- **Backend & Database:** Render (Web Service + Managed PostgreSQL)
- **Frontend:** Vercel (Fast Global Edge CDN)

---

## Architecture in Production

```mermaid
flowchart LR
    Browser["User Browser"] -->|HTTPS| Vercel["Vercel Edge CDN\n(React SPA)"]
    Vercel -->|REST API with JWT| Render["Render Web Service\n(FastAPI + Uvicorn)"]
    Render --> DB[("PostgreSQL Database\n(Render / Neon / Supabase)")]
```

---

## 1. Backend Deployment (Render)

1. Create an account on [Render](https://render.com).
2. Create a new **PostgreSQL Database** on Render (free tier) or on [Neon](https://neon.tech).
   - Copy the External Database Connection String: `postgresql://user:password@host/dbname`.
3. Create a new **Web Service**:
   - Connect your GitHub repository.
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Configure **Environment Variables** in Render dashboard:
   ```env
   SECRET_KEY=generate-a-random-32-byte-hex-string
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   DATABASE_URL=postgresql://user:password@host/dbname
   UPLOAD_DIR=./uploads
   MAX_UPLOAD_SIZE_MB=50
   ```
5. Deploy and execute database seeder via Render Shell:
   ```bash
   python seed.py
   ```
   Your backend API will be live at `https://terraguard-api.onrender.com`.

---

## 2. Frontend Deployment (Vercel)

1. Create an account on [Vercel](https://vercel.com).
2. Click **Add New Project** and select your GitHub repository.
3. Configure the Project:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add **Environment Variables**:
   ```env
   VITE_API_URL=https://terraguard-api.onrender.com
   ```
5. Click **Deploy**. Vercel will build and assign an instant production URL (e.g., `https://terraguard.vercel.app`).

---

## 3. Local Development Setup

### Backend:
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8000
```

### Frontend:
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`.
Default Admin Login: `admin@terraguard.in` / `Admin@123`
Default Analyst Login: `analyst@terraguard.in` / `Analyst@123`
