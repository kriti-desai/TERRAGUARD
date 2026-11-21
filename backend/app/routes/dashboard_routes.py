"""
Dashboard Routes – /dashboard
Summary statistics, risk distribution, and recent activity.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime

from ..database import get_db
from ..models import (
    Location, RiskAssessment, Alert, AnalysisRun, Dataset,
    AnomalyResult, User
)
from ..schemas import DashboardSummary, RiskDistribution, RecentActivityItem
from ..auth import get_current_user

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return aggregate dashboard metrics:
    location counts by risk level, total anomalies, dataset stats.
    """
    # Build a sub-query: latest risk assessment id per location
    latest_ra_subq = (
        db.query(
            RiskAssessment.location_id,
            func.max(RiskAssessment.id).label("max_id"),
        )
        .group_by(RiskAssessment.location_id)
        .subquery()
    )
    latest_assessments = (
        db.query(RiskAssessment)
        .join(latest_ra_subq, RiskAssessment.id == latest_ra_subq.c.max_id)
        .all()
    )

    risk_counts = {"HIGH": 0, "ELEVATED": 0, "MODERATE": 0, "LOW": 0}
    for ra in latest_assessments:
        level = ra.risk_level.upper()
        if level in risk_counts:
            risk_counts[level] += 1

    total_locations = db.query(Location).count()
    total_anomalies = db.query(AnomalyResult).filter(AnomalyResult.is_anomaly == True).count()

    latest_run = db.query(AnalysisRun).order_by(AnalysisRun.run_at.desc()).first()
    latest_analysis_date = latest_run.run_at if latest_run else None

    total_datasets = db.query(Dataset).count()
    processed_datasets = db.query(Dataset).filter(Dataset.status == "PROCESSED").count()

    return DashboardSummary(
        total_locations=total_locations,
        high_risk=risk_counts["HIGH"],
        elevated_risk=risk_counts["ELEVATED"],
        moderate_risk=risk_counts["MODERATE"],
        low_risk=risk_counts["LOW"],
        total_anomalies=total_anomalies,
        latest_analysis_date=latest_analysis_date,
        total_datasets=total_datasets,
        processed_datasets=processed_datasets,
    )


@router.get("/risk-distribution", response_model=List[RiskDistribution])
def get_risk_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return count of locations per risk level (latest assessment only).
    """
    latest_ra_subq = (
        db.query(
            RiskAssessment.location_id,
            func.max(RiskAssessment.id).label("max_id"),
        )
        .group_by(RiskAssessment.location_id)
        .subquery()
    )
    rows = (
        db.query(RiskAssessment.risk_level, func.count(RiskAssessment.id).label("cnt"))
        .join(latest_ra_subq, RiskAssessment.id == latest_ra_subq.c.max_id)
        .group_by(RiskAssessment.risk_level)
        .all()
    )

    # Ensure all four levels are always present
    dist = {lvl: 0 for lvl in ["HIGH", "ELEVATED", "MODERATE", "LOW"]}
    for row in rows:
        dist[row.risk_level.upper()] = row.cnt

    return [RiskDistribution(risk_level=k, count=v) for k, v in dist.items()]


@router.get("/recent-activity", response_model=List[RecentActivityItem])
def get_recent_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return the last 10 events combining alerts and analysis runs,
    sorted by most recent first.
    """
    alerts = (
        db.query(Alert)
        .order_by(Alert.created_at.desc())
        .limit(10)
        .all()
    )
    runs = (
        db.query(AnalysisRun)
        .order_by(AnalysisRun.run_at.desc())
        .limit(10)
        .all()
    )

    items: List[RecentActivityItem] = []
    for a in alerts:
        items.append(
            RecentActivityItem(
                type="alert",
                id=a.id,
                description=f"[{a.risk_level}] {a.title}",
                created_at=a.created_at,
            )
        )
    for r in runs:
        items.append(
            RecentActivityItem(
                type="analysis",
                id=r.id,
                description=f"Analysis run #{r.id} – {r.anomalies_detected} anomalies detected",
                created_at=r.run_at,
            )
        )

    # Sort combined list newest-first and take top 10
    items.sort(key=lambda x: x.created_at or datetime.min, reverse=True)
    return items[:10]
