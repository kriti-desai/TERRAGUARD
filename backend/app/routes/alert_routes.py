"""
Alert Routes – /alerts
Endpoints for reviewing, querying, creating, and updating alerts.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from ..database import get_db
from ..auth import get_current_user
from ..models import Alert, AlertStatus, User
from ..schemas import AlertOut, AlertCreate, AlertUpdate

router = APIRouter()

@router.get("", response_model=List[AlertOut])
def list_alerts(
    status_filter: Optional[str] = Query(None, alias="status"),
    risk_level: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List alerts with optional status and risk_level filtering.
    """
    query = db.query(Alert)
    if status_filter:
        query = query.filter(Alert.status == status_filter.upper())
    if risk_level:
        query = query.filter(Alert.risk_level == risk_level.upper())
    return query.order_by(Alert.created_at.desc()).limit(limit).all()


@router.post("", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
def create_manual_alert(
    payload: AlertCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a manual alert for a location.
    """
    alert = Alert(
        location_id=payload.location_id,
        risk_level=payload.risk_level.upper(),
        title=payload.title,
        description=payload.description,
        displacement_mm=payload.displacement_mm,
        anomaly_score=payload.anomaly_score,
        status=AlertStatus.NEW,
        assigned_analyst=payload.assigned_analyst or current_user.full_name,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.get("/{alert_id}", response_model=AlertOut)
def get_alert_detail(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed information for a single alert.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found."
        )
    return alert


@router.patch("/{alert_id}", response_model=AlertOut)
def update_alert(
    alert_id: int,
    payload: AlertUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update alert status (NEW, UNDER_REVIEW, RESOLVED) or assigned analyst.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found."
        )

    if payload.status:
        st_upper = payload.status.upper()
        if st_upper not in [AlertStatus.NEW.value, AlertStatus.UNDER_REVIEW.value, AlertStatus.RESOLVED.value]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status '{payload.status}'. Must be NEW, UNDER_REVIEW, or RESOLVED."
            )
        alert.status = st_upper

    if payload.assigned_analyst is not None:
        alert.assigned_analyst = payload.assigned_analyst

    if payload.description is not None:
        alert.description = payload.description

    alert.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(alert)
    return alert
