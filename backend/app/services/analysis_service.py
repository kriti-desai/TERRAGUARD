"""
Analysis Service – Full ML Pipeline Coordinator for TERRAGUARD

Orchestrates:
  1. Load observations from dataset
  2. Run Isolation Forest anomaly detection
  3. Run rule-based risk scoring per location
  4. Persist AnalysisRun, AnomalyResult, RiskAssessment to DB
  5. Generate Alerts for ELEVATED / HIGH locations
  6. Return a summary dict
"""
import json
import logging
import pandas as pd
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from ..models import (
    Observation, AnalysisRun, AnomalyResult, RiskAssessment, Dataset, DatasetStatus
)
from ..ml.anomaly_detector import run_anomaly_detection
from ..ml.risk_classifier import compute_risk_score
from .alert_service import generate_alerts

logger = logging.getLogger(__name__)


def run_full_analysis(dataset_id: int, user_id: int, contamination: float, db: Session) -> dict:
    """
    Full ML pipeline for a given dataset.

    Args:
        dataset_id:    Dataset to analyse.
        user_id:       ID of the user triggering the run.
        contamination: Isolation Forest contamination parameter (0.01-0.5).
        db:            Active SQLAlchemy session.

    Returns:
        Summary dict with run id, counts, and per-location risk details.

    Raises:
        ValueError if dataset not found or has insufficient observations.
    """
    # ------------------------------------------------------------------
    # 1. Fetch observations
    # ------------------------------------------------------------------
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise ValueError(f"Dataset {dataset_id} not found.")

    observations = (
        db.query(Observation)
        .filter(Observation.dataset_id == dataset_id)
        .all()
    )
    if len(observations) < 5:
        raise ValueError(
            f"Dataset {dataset_id} has only {len(observations)} observations. "
            "Need at least 5 to run analysis."
        )

    logger.info(
        "Starting analysis for dataset_id=%d, %d observations, contamination=%.2f",
        dataset_id, len(observations), contamination,
    )

    # ------------------------------------------------------------------
    # 2. Build DataFrame
    # ------------------------------------------------------------------
    rows = []
    for obs in observations:
        rows.append({
            "obs_id": obs.id,
            "location_id": obs.location_id,
            "observation_date": obs.observation_date,
            "latitude": obs.latitude,
            "longitude": obs.longitude,
            "displacement_mm": obs.displacement_mm,
            "displacement_velocity_mm_year": obs.displacement_velocity_mm_year,
            "rainfall_mm": obs.rainfall_mm,
            "elevation_m": obs.elevation_m,
            "mining_activity_index": obs.mining_activity_index,
        })
    df = pd.DataFrame(rows)

    # ------------------------------------------------------------------
    # 3. Anomaly detection
    # ------------------------------------------------------------------
    detection_result = run_anomaly_detection(df, contamination=contamination)

    # ------------------------------------------------------------------
    # 4. Create AnalysisRun record
    # ------------------------------------------------------------------
    analysis_run = AnalysisRun(
        dataset_id=dataset_id,
        run_by=user_id,
        model_type="IsolationForest",
        total_observations=detection_result["total"],
        anomalies_detected=detection_result["anomalies"],
        contamination_param=contamination,
        features_used=json.dumps(detection_result["feature_names"]),
        notes=f"Auto-run via API at {datetime.now(timezone.utc).isoformat()}",
    )
    db.add(analysis_run)
    db.flush()   # get analysis_run.id before committing

    # ------------------------------------------------------------------
    # 5. Persist AnomalyResult rows
    # ------------------------------------------------------------------
    for i, obs in enumerate(observations):
        ar = AnomalyResult(
            analysis_run_id=analysis_run.id,
            observation_id=obs.id,
            anomaly_score=detection_result["normalized_scores"][i],
            is_anomaly=detection_result["is_anomaly"][i],
            latitude=obs.latitude,
            longitude=obs.longitude,
        )
        db.add(ar)

    db.flush()

    # ------------------------------------------------------------------
    # 6. Risk scoring – aggregate per location
    # ------------------------------------------------------------------
    # Map: location_id -> list of (obs_index, normalized_anomaly_score)
    location_obs_map: dict = {}
    for i, obs in enumerate(observations):
        loc_id = obs.location_id
        if loc_id is None:
            continue
        if loc_id not in location_obs_map:
            location_obs_map[loc_id] = []
        location_obs_map[loc_id].append({
            "displacement_mm": obs.displacement_mm,
            "displacement_velocity_mm_year": obs.displacement_velocity_mm_year,
            "rainfall_mm": obs.rainfall_mm,
            "mining_activity_index": obs.mining_activity_index,
            "anomaly_score": detection_result["normalized_scores"][i],
        })

    risk_assessments_created = []
    location_risk_summary = []

    for loc_id, obs_list in location_obs_map.items():
        loc_df = pd.DataFrame(obs_list)

        # Use worst-case (max) values to represent location risk
        def _safe_max(col):
            vals = loc_df[col].dropna()
            return float(vals.abs().max()) if not vals.empty else None

        def _safe_mean(col):
            vals = loc_df[col].dropna()
            return float(vals.mean()) if not vals.empty else None

        risk_result = compute_risk_score(
            displacement_mm=_safe_max("displacement_mm"),
            displacement_velocity_mm_year=_safe_max("displacement_velocity_mm_year"),
            rainfall_mm=_safe_mean("rainfall_mm"),
            mining_activity_index=_safe_mean("mining_activity_index"),
            anomaly_score=float(loc_df["anomaly_score"].max()),
        )

        ra = RiskAssessment(
            location_id=loc_id,
            analysis_run_id=analysis_run.id,
            risk_level=risk_result["risk_level"],
            risk_score=risk_result["risk_score"],
            displacement_factor=risk_result.get("displacement_factor"),
            velocity_factor=risk_result.get("velocity_factor"),
            rainfall_factor=risk_result.get("rainfall_factor"),
            mining_factor=risk_result.get("mining_factor"),
            anomaly_factor=risk_result.get("anomaly_factor"),
            model_method=risk_result["model_method"],
        )
        db.add(ra)
        risk_assessments_created.append(ra)
        location_risk_summary.append({
            "location_id": loc_id,
            "risk_level": risk_result["risk_level"],
            "risk_score": risk_result["risk_score"],
        })

    db.flush()

    # ------------------------------------------------------------------
    # 7. Generate Alerts
    # ------------------------------------------------------------------
    alerts_created = generate_alerts(analysis_run.id, risk_assessments_created, db)

    # ------------------------------------------------------------------
    # 8. Mark dataset as PROCESSED
    # ------------------------------------------------------------------
    dataset.status = DatasetStatus.PROCESSED
    dataset.processed_at = datetime.now(timezone.utc)

    db.commit()

    logger.info(
        "Analysis run #%d complete: %d anomalies, %d risk assessments, %d alerts",
        analysis_run.id,
        detection_result["anomalies"],
        len(risk_assessments_created),
        alerts_created,
    )

    return {
        "analysis_run_id": analysis_run.id,
        "dataset_id": dataset_id,
        "total_observations": detection_result["total"],
        "anomalies_detected": detection_result["anomalies"],
        "features_used": detection_result["feature_names"],
        "locations_assessed": len(risk_assessments_created),
        "alerts_created": alerts_created,
        "location_risk_summary": location_risk_summary,
    }
