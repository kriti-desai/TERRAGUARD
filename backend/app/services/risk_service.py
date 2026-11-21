"""
Risk Service – Query helpers for risk data.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models import Location, RiskAssessment


def get_all_risk_locations(db: Session) -> list:
    """
    Return every Location combined with its latest RiskAssessment.
    Locations with no assessment are still included (latest_risk=None).
    """
    # Subquery: max risk assessment id per location
    latest_subq = (
        db.query(
            RiskAssessment.location_id,
            func.max(RiskAssessment.id).label("max_id"),
        )
        .group_by(RiskAssessment.location_id)
        .subquery()
    )

    locations = db.query(Location).all()

    # Build a dict: location_id -> latest RiskAssessment
    latest_ra_map = {}
    latest_ras = (
        db.query(RiskAssessment)
        .join(latest_subq, RiskAssessment.id == latest_subq.c.max_id)
        .all()
    )
    for ra in latest_ras:
        latest_ra_map[ra.location_id] = ra

    result = []
    for loc in locations:
        result.append({
            "location": loc,
            "latest_risk": latest_ra_map.get(loc.id),
        })
    return result


def get_location_risk_history(location_id: int, db: Session) -> list:
    """
    Return all RiskAssessment records for a location, newest first.
    """
    return (
        db.query(RiskAssessment)
        .filter(RiskAssessment.location_id == location_id)
        .order_by(RiskAssessment.assessed_at.desc())
        .all()
    )
