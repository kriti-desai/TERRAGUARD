"""
TERRAGUARD Pydantic Schemas
Request / Response models for all API endpoints.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ---------------------------------------------------------------------------
# Auth / User
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2)
    password: str = Field(..., min_length=6)
    role: Optional[str] = "analyst"


class UserLogin(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------------------------------------------------------------------------
# Location
# ---------------------------------------------------------------------------

class LocationOut(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    region: Optional[str] = None
    state: Optional[str] = None
    elevation_m: Optional[float] = None
    mining_area: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Dataset
# ---------------------------------------------------------------------------

class DatasetOut(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_type: str
    status: str
    total_records: int
    valid_records: int
    upload_notes: Optional[str] = None
    uploaded_by: Optional[int] = None
    uploaded_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DatasetUploadResponse(BaseModel):
    dataset: DatasetOut
    preview: List[dict]           # first 5 rows as list of dicts
    validation_errors: List[str]  # any parsing/validation warnings
    total_records: int
    valid_records: int


# ---------------------------------------------------------------------------
# Observation
# ---------------------------------------------------------------------------

class ObservationOut(BaseModel):
    id: int
    dataset_id: int
    location_id: Optional[int] = None
    observation_date: Optional[datetime] = None
    latitude: float
    longitude: float
    displacement_mm: Optional[float] = None
    displacement_velocity_mm_year: Optional[float] = None
    rainfall_mm: Optional[float] = None
    elevation_m: Optional[float] = None
    mining_activity_index: Optional[float] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Analysis
# ---------------------------------------------------------------------------

class AnalysisRunRequest(BaseModel):
    dataset_id: int
    contamination: float = Field(default=0.1, ge=0.01, le=0.5)


class AnalysisRunOut(BaseModel):
    id: int
    dataset_id: Optional[int] = None
    run_by: Optional[int] = None
    model_type: str
    total_observations: int
    anomalies_detected: int
    contamination_param: float
    features_used: Optional[str] = None
    run_at: Optional[datetime] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class AnomalyResultOut(BaseModel):
    id: int
    analysis_run_id: int
    observation_id: Optional[int] = None
    anomaly_score: Optional[float] = None
    is_anomaly: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Risk Assessment
# ---------------------------------------------------------------------------

class RiskAssessmentOut(BaseModel):
    id: int
    location_id: int
    analysis_run_id: Optional[int] = None
    risk_level: str
    risk_score: float
    displacement_factor: Optional[float] = None
    velocity_factor: Optional[float] = None
    rainfall_factor: Optional[float] = None
    mining_factor: Optional[float] = None
    anomaly_factor: Optional[float] = None
    model_method: str
    assessed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class LocationRiskOut(BaseModel):
    """Location combined with its latest risk assessment."""
    location: LocationOut
    latest_risk: Optional[RiskAssessmentOut] = None


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

class AlertCreate(BaseModel):
    location_id: int
    risk_level: str
    title: str
    description: str
    displacement_mm: Optional[float] = None
    anomaly_score: Optional[float] = None
    assigned_analyst: Optional[str] = None


class AlertUpdate(BaseModel):
    status: Optional[str] = None
    assigned_analyst: Optional[str] = None
    description: Optional[str] = None


class AlertOut(BaseModel):
    id: int
    location_id: int
    analysis_run_id: Optional[int] = None
    risk_level: str
    title: str
    description: str
    observation_date: Optional[datetime] = None
    displacement_mm: Optional[float] = None
    anomaly_score: Optional[float] = None
    status: str
    assigned_analyst: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

class ReportGenerateRequest(BaseModel):
    location_id: int
    analysis_run_id: Optional[int] = None


class ReportOut(BaseModel):
    id: int
    location_id: Optional[int] = None
    analysis_run_id: Optional[int] = None
    generated_by: Optional[int] = None
    file_path: str
    generated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class RiskDistribution(BaseModel):
    risk_level: str
    count: int


class RecentActivityItem(BaseModel):
    type: str          # "alert" or "analysis"
    id: int
    description: str
    created_at: Optional[datetime] = None


class DashboardSummary(BaseModel):
    total_locations: int
    high_risk: int
    elevated_risk: int
    moderate_risk: int
    low_risk: int
    total_anomalies: int
    latest_analysis_date: Optional[datetime] = None
    total_datasets: int
    processed_datasets: int
