"""
Risk Routes – /risk
Endpoints for viewing geospatial risk scores, location histories, and 3D terrain data.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..auth import get_current_user
from ..models import Location, RiskAssessment, Observation, User
from ..schemas import LocationRiskOut, LocationOut, RiskAssessmentOut, ObservationOut
from ..services.risk_service import get_all_risk_locations, get_location_risk_history
from ..geospatial.terrain import generate_demo_terrain

router = APIRouter()

@router.get("/locations", response_model=List[LocationRiskOut])
def get_risk_locations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all monitored locations along with their latest risk assessment.
    """
    return get_all_risk_locations(db)


@router.get("/terrain")
def get_terrain_data(
    current_user: User = Depends(get_current_user),
):
    """
    Get 3D terrain elevation grid for 3D visualization.
    Uses synthetic demonstration terrain centered on mining regions.
    """
    return generate_demo_terrain()


@router.get("/{location_id}", response_model=LocationRiskOut)
def get_location_risk(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a single location profile and its latest risk assessment.
    """
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found."
        )
    latest_risk = (
        db.query(RiskAssessment)
        .filter(RiskAssessment.location_id == location_id)
        .order_by(RiskAssessment.assessed_at.desc())
        .first()
    )
    return {
        "location": loc,
        "latest_risk": latest_risk
    }


@router.get("/{location_id}/history", response_model=List[RiskAssessmentOut])
def get_location_history(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get historical risk assessments for a specific location.
    """
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found."
        )
    return get_location_risk_history(location_id, db)


@router.get("/{location_id}/observations", response_model=List[ObservationOut])
def get_location_observations(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get chronological observed physical measurements (displacement, velocity, rainfall, mining index)
    for a specific location.
    """
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found."
        )
    return (
        db.query(Observation)
        .filter(Observation.location_id == location_id)
        .order_by(Observation.observation_date.asc(), Observation.id.asc())
        .all()
    )
