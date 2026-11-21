"""
Alert Generation Service for TERRAGUARD
Creates DB alert records for ELEVATED and HIGH risk locations.
"""
from sqlalchemy.orm import Session
from ..models import Alert, AlertStatus
import logging

logger = logging.getLogger(__name__)


def generate_alerts(
    analysis_run_id: int,
    risk_assessments: list,  # list of RiskAssessment ORM objects
    db: Session,
) -> int:
    """
    Create Alert records for every ELEVATED or HIGH risk assessment.

    Deduplication rule:
        Skip if an open (NEW or UNDER_REVIEW) alert already exists
        for the same location_id AND risk_level.

    Args:
        analysis_run_id: ID of the parent AnalysisRun.
        risk_assessments: List of RiskAssessment ORM instances.
        db:              Active DB session.

    Returns:
        Number of new alerts created.
    """
    created_count = 0
    trigger_levels = {"ELEVATED", "HIGH"}

    for ra in risk_assessments:
        if ra.risk_level.upper() not in trigger_levels:
            continue

        # Deduplication: check for existing open alert
        existing = (
            db.query(Alert)
            .filter(
                Alert.location_id == ra.location_id,
                Alert.risk_level == ra.risk_level,
                Alert.status.in_([AlertStatus.NEW, AlertStatus.UNDER_REVIEW]),
            )
            .first()
        )
        if existing:
            logger.info(
                "Skipping duplicate alert for location_id=%d risk_level=%s (alert_id=%d)",
                ra.location_id, ra.risk_level, existing.id,
            )
            continue

        # Build human-readable description
        risk_label = ra.risk_level.upper()
        priority_msg = (
            "Immediate ground-truth survey recommended."
            if risk_label == "HIGH"
            else "Field investigation advised within 30 days."
        )

        description = (
            f"{risk_label} subsidence risk detected at location ID {ra.location_id}. "
            f"Risk score: {ra.risk_score:.1f}/100. "
        )
        if ra.displacement_factor is not None:
            description += f"Displacement factor: {ra.displacement_factor:.1f}. "
        if ra.velocity_factor is not None:
            description += f"Velocity factor: {ra.velocity_factor:.1f}. "
        if ra.anomaly_factor is not None:
            description += f"ML anomaly factor: {ra.anomaly_factor:.1f}. "
        description += priority_msg

        alert = Alert(
            location_id=ra.location_id,
            analysis_run_id=analysis_run_id,
            risk_level=ra.risk_level,
            title=f"{risk_label} Subsidence Risk – Location {ra.location_id}",
            description=description,
            status=AlertStatus.NEW,
        )
        db.add(alert)
        created_count += 1
        logger.info(
            "Created %s alert for location_id=%d (score=%.1f)",
            risk_label, ra.location_id, ra.risk_score,
        )

    db.commit()
    logger.info("Alert generation complete: %d new alerts created.", created_count)
    return created_count
