"""
Analysis Routes – /analysis
Trigger ML pipeline runs and browse historical results.
"""
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_user
from ..models import AnalysisRun, AnomalyResult, User
from ..schemas import AnalysisRunRequest, AnalysisRunOut, AnomalyResultOut
from ..services.analysis_service import run_full_analysis

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/run", status_code=status.HTTP_201_CREATED)
def trigger_analysis(
    payload: AnalysisRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger the full ML analysis pipeline for a dataset.
    Runs anomaly detection + risk scoring + alert generation.
    Returns a summary of the run.
    """
    try:
        summary = run_full_analysis(
            dataset_id=payload.dataset_id,
            user_id=current_user.id,
            contamination=payload.contamination,
            db=db,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    return summary


@router.get("/history", response_model=list[AnalysisRunOut])
def list_analysis_runs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all analysis runs, newest first."""
    return (
        db.query(AnalysisRun)
        .order_by(AnalysisRun.run_at.desc())
        .all()
    )


@router.get("/{run_id}", response_model=AnalysisRunOut)
def get_analysis_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return details of a single analysis run."""
    run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis run not found.")
    return run


@router.get("/{run_id}/anomalies", response_model=list[AnomalyResultOut])
def get_anomalies(
    run_id: int,
    anomalies_only: bool = Query(default=False, description="If true, return only anomalous results."),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return paginated anomaly results for a given analysis run.
    Use ?anomalies_only=true to filter to anomalous rows only.
    """
    run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis run not found.")

    q = db.query(AnomalyResult).filter(AnomalyResult.analysis_run_id == run_id)
    if anomalies_only:
        q = q.filter(AnomalyResult.is_anomaly == True)

    return q.order_by(AnomalyResult.anomaly_score.desc()).offset(skip).limit(limit).all()
