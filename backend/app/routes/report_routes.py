"""
Report Routes – /reports
Endpoints for generating and downloading professional PDF reports.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
import os

from ..database import get_db
from ..auth import get_current_user
from ..models import Report, Location, RiskAssessment, Observation, Alert, AnalysisRun, User, AnomalyResult
from ..schemas import ReportOut, ReportGenerateRequest
from ..reports.pdf_generator import generate_location_report

router = APIRouter()

REPORTS_DIR = "./reports"
os.makedirs(REPORTS_DIR, exist_ok=True)

@router.post("/generate", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def create_report(
    payload: ReportGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a formal PDF report for a monitored location.
    Gathers geodetic observations, latest risk assessment, and active alerts.
    """
    location = db.query(Location).filter(Location.id == payload.location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {payload.location_id} not found."
        )

    # Latest risk assessment
    risk_q = db.query(RiskAssessment).filter(RiskAssessment.location_id == payload.location_id)
    if payload.analysis_run_id:
        risk_q = risk_q.filter(RiskAssessment.analysis_run_id == payload.analysis_run_id)
    latest_risk = risk_q.order_by(RiskAssessment.assessed_at.desc()).first()

    # Observations count & latest observation
    obs_q = db.query(Observation).filter(Observation.location_id == payload.location_id)
    obs_count = obs_q.count()
    latest_obs = obs_q.order_by(Observation.observation_date.desc()).first()

    # Active alerts count
    alerts_count = db.query(Alert).filter(Alert.location_id == payload.location_id).count()

    # Determine Isolation Forest Anomaly Score (0.0 – 1.0) and Anomaly Classification
    anomaly_score = None
    is_anomaly = False
    run_id = payload.analysis_run_id or (latest_risk.analysis_run_id if latest_risk else None)

    if run_id:
        # Query max anomaly result across observations for this location within this run
        ar_record = (
            db.query(AnomalyResult)
            .join(Observation, Observation.id == AnomalyResult.observation_id)
            .filter(Observation.location_id == payload.location_id)
            .filter(AnomalyResult.analysis_run_id == run_id)
            .order_by(AnomalyResult.anomaly_score.desc())
            .first()
        )
        if ar_record and ar_record.anomaly_score is not None:
            anomaly_score = float(ar_record.anomaly_score)
            is_anomaly = bool(ar_record.is_anomaly)

    # If no AnomalyResult record was found, derive accurately from RiskAssessment.anomaly_factor (0-15 pts)
    # Factor formula: anomaly_factor = min(anomaly_score, 1.0) * 15.0  --> anomaly_score = anomaly_factor / 15.0
    if anomaly_score is None and latest_risk and latest_risk.anomaly_factor is not None:
        anomaly_score = round(min(float(latest_risk.anomaly_factor) / 15.0, 1.0), 4)
        is_anomaly = anomaly_score >= 0.65

    if anomaly_score is None:
        anomaly_score = 0.150
        is_anomaly = False

    # Prepare data dictionary for ReportLab
    filename = f"TERRAGUARD_Report_Loc{location.id}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.pdf"
    file_path = os.path.join(REPORTS_DIR, filename)

    report_data = {
        "location_id": location.id,
        "location_name": location.name,
        "latitude": location.latitude or 0.0,
        "longitude": location.longitude or 0.0,
        "region": location.region or "Mining Belt",
        "state": location.state or "India",
        "elevation_m": location.elevation_m if location.elevation_m is not None else (latest_obs.elevation_m if (latest_obs and latest_obs.elevation_m is not None) else 200.0),
        "dataset_name": f"Dataset #{latest_obs.dataset_id}" if latest_obs else "Primary InSAR Telemetry",
        "observations_count": obs_count,
        "risk_level": latest_risk.risk_level if latest_risk else "LOW",
        "risk_score": latest_risk.risk_score if (latest_risk and latest_risk.risk_score is not None) else 15.0,
        "displacement_factor": latest_risk.displacement_factor if latest_risk else 0.0,
        "velocity_factor": latest_risk.velocity_factor if latest_risk else 0.0,
        "rainfall_factor": latest_risk.rainfall_factor if latest_risk else 0.0,
        "mining_factor": latest_risk.mining_factor if latest_risk else 0.0,
        "anomaly_factor": latest_risk.anomaly_factor if (latest_risk and latest_risk.anomaly_factor is not None) else round(anomaly_score * 15.0, 2),
        "model_method": latest_risk.model_method if (latest_risk and latest_risk.model_method) else "Explainable Multi-Factor Index",
        "displacement_mm": (latest_obs.displacement_mm if (latest_obs and latest_obs.displacement_mm is not None) else 0.0),
        "displacement_velocity_mm_year": (latest_obs.displacement_velocity_mm_year if (latest_obs and latest_obs.displacement_velocity_mm_year is not None) else 0.0),
        "anomaly_score": anomaly_score,
        "is_anomaly": is_anomaly,
        "rainfall_mm": (latest_obs.rainfall_mm if (latest_obs and latest_obs.rainfall_mm is not None) else 0.0),
        "mining_activity_index": (latest_obs.mining_activity_index if (latest_obs and latest_obs.mining_activity_index is not None) else 0.5),
        "alerts_count": alerts_count,
        "analysis_date": latest_risk.assessed_at.strftime("%Y-%m-%d %H:%M UTC") if (latest_risk and latest_risk.assessed_at) else datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
    }

    try:
        generate_location_report(report_data, file_path)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compile PDF report: {str(exc)}"
        )

    # Save report metadata to database
    report = Report(
        location_id=location.id,
        analysis_run_id=payload.analysis_run_id,
        generated_by=current_user.id,
        file_path=file_path,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("", response_model=List[ReportOut])
def list_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all generated reports.
    """
    return db.query(Report).order_by(Report.generated_at.desc()).all()


@router.get("/{report_id}/download")
def download_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Download generated PDF report file.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report or not os.path.exists(report.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report file not found."
        )
    return FileResponse(
        path=report.file_path,
        media_type="application/pdf",
        filename=os.path.basename(report.file_path),
    )
