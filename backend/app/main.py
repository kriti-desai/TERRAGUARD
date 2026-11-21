"""
TERRAGUARD FastAPI Application
Main entry point with router registration, CORS, startup initialization, and health checks.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pathlib import Path
import logging
import os

from .database import engine, Base
from .config import settings
from .routes import (
    auth_routes,
    dashboard_routes,
    dataset_routes,
    analysis_routes,
    risk_routes,
    alert_routes,
    report_routes,
)

# Initialize database schema tables on startup
Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("terraguard")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure upload and reports directories exist
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path("./reports").mkdir(parents=True, exist_ok=True)

    if settings.ENVIRONMENT.lower() == "production":
        if "dev-secret-key" in settings.SECRET_KEY:
            logger.warning(
                "CRITICAL SECURITY WARNING: Default development SECRET_KEY is active in production mode! "
                "Set a secure 256-bit SECRET_KEY in your production environment variables."
            )
    yield

app = FastAPI(
    title="TERRAGUARD API",
    description="AI-Powered Underground Land Stability & Subsidence Risk Intelligence Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS setup
# Accepts comma-separated origins from CORS_ORIGINS as well as FRONTEND_URL
raw_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
if getattr(settings, "FRONTEND_URL", None):
    for fo in [o.strip() for o in settings.FRONTEND_URL.split(",") if o.strip()]:
        if fo not in raw_origins:
            raw_origins.append(fo)

origins = []
for o in raw_origins:
    cleaned = o.rstrip("/") if o != "*" else o
    if cleaned and cleaned not in origins:
        origins.append(cleaned)

if not origins:
    origins = ["*"]

# If wildcard origin is configured, disable allow_credentials to adhere to W3C/Fetch CORS standard
allow_creds = origins != ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_creds,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_routes.router, prefix="/auth", tags=["Authentication"])
app.include_router(dashboard_routes.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(dataset_routes.router, prefix="/datasets", tags=["Datasets"])
app.include_router(analysis_routes.router, prefix="/analysis", tags=["Analysis"])
app.include_router(risk_routes.router, prefix="/risk", tags=["Risk"])
app.include_router(alert_routes.router, prefix="/alerts", tags=["Alerts"])
app.include_router(report_routes.router, prefix="/reports", tags=["Reports"])

@app.get("/", tags=["Health"])
def root():
    return {
        "platform": "TERRAGUARD",
        "tagline": "Predict. Monitor. Protect.",
        "status": "online",
        "version": "1.0.0"
    }

@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
