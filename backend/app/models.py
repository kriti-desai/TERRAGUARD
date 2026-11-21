"""
TERRAGUARD Database Models
All tables with proper relationships, timestamps and unit documentation.
"""
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum


# ---------------------------------------------------------------------------
# Python-level enums (used as string values in the DB columns)
# ---------------------------------------------------------------------------

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    ANALYST = "analyst"


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    ELEVATED = "ELEVATED"
    HIGH = "HIGH"


class AlertStatus(str, enum.Enum):
    NEW = "NEW"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"


class DatasetStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"


# ---------------------------------------------------------------------------
# ORM Models
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default=UserRole.ANALYST)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    datasets = relationship("Dataset", back_populates="uploaded_by_user")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)    # decimal degrees WGS84
    longitude = Column(Float, nullable=False)   # decimal degrees WGS84
    region = Column(String, nullable=True)
    state = Column(String, nullable=True)
    elevation_m = Column(Float, nullable=True)  # metres above sea level
    mining_area = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    observations = relationship("Observation", back_populates="location")
    risk_assessments = relationship("RiskAssessment", back_populates="location")
    alerts = relationship("Alert", back_populates="location")


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)           # saved filename on disk
    original_filename = Column(String, nullable=False)  # user's original filename
    file_type = Column(String, nullable=False)          # "csv" or "geojson"
    status = Column(String, default=DatasetStatus.UPLOADED)
    total_records = Column(Integer, default=0)
    valid_records = Column(Integer, default=0)
    upload_notes = Column(Text, nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)

    uploaded_by_user = relationship("User", back_populates="datasets")
    observations = relationship("Observation", back_populates="dataset")


class Observation(Base):
    __tablename__ = "observations"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    observation_date = Column(DateTime, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    displacement_mm = Column(Float, nullable=True)                  # mm vertical displacement
    displacement_velocity_mm_year = Column(Float, nullable=True)    # mm/year
    rainfall_mm = Column(Float, nullable=True)                      # mm cumulative
    elevation_m = Column(Float, nullable=True)
    mining_activity_index = Column(Float, nullable=True)            # 0-1 index
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    location = relationship("Location", back_populates="observations")
    dataset = relationship("Dataset", back_populates="observations")


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    run_by = Column(Integer, ForeignKey("users.id"))
    model_type = Column(String, default="IsolationForest")
    total_observations = Column(Integer, default=0)
    anomalies_detected = Column(Integer, default=0)
    contamination_param = Column(Float, default=0.1)
    features_used = Column(Text, nullable=True)   # stored as JSON string
    run_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)

    anomaly_results = relationship("AnomalyResult", back_populates="analysis_run")


class AnomalyResult(Base):
    __tablename__ = "anomaly_results"

    id = Column(Integer, primary_key=True, index=True)
    analysis_run_id = Column(Integer, ForeignKey("analysis_runs.id"))
    observation_id = Column(Integer, ForeignKey("observations.id"))
    anomaly_score = Column(Float, nullable=True)   # normalized 0-1
    is_anomaly = Column(Boolean, default=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    analysis_run = relationship("AnalysisRun", back_populates="anomaly_results")


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"))
    analysis_run_id = Column(Integer, ForeignKey("analysis_runs.id"), nullable=True)
    risk_level = Column(String, nullable=False)
    risk_score = Column(Float, nullable=False)          # 0-100 provisional index
    displacement_factor = Column(Float, nullable=True)
    velocity_factor = Column(Float, nullable=True)
    rainfall_factor = Column(Float, nullable=True)
    mining_factor = Column(Float, nullable=True)
    anomaly_factor = Column(Float, nullable=True)
    model_method = Column(String, default="rule_based_index")
    assessed_at = Column(DateTime(timezone=True), server_default=func.now())

    location = relationship("Location", back_populates="risk_assessments")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"))
    analysis_run_id = Column(Integer, ForeignKey("analysis_runs.id"), nullable=True)
    risk_level = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    observation_date = Column(DateTime, nullable=True)
    displacement_mm = Column(Float, nullable=True)
    anomaly_score = Column(Float, nullable=True)
    status = Column(String, default=AlertStatus.NEW)
    assigned_analyst = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    location = relationship("Location", back_populates="alerts")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    analysis_run_id = Column(Integer, ForeignKey("analysis_runs.id"), nullable=True)
    generated_by = Column(Integer, ForeignKey("users.id"))
    file_path = Column(String, nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
