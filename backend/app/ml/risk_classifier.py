"""
Subsidence Risk Classification for TERRAGUARD

IMPORTANT DISCLAIMER:
This module uses a provisional, rule-based risk index.
It does NOT use a validated, calibrated geological model.
Risk scores are relative indicators based on available measurements.
They must NOT be used as definitive predictions of subsidence.
A proper risk model requires validated ground truth labels,
expert geological review and site-specific calibration.
"""
from typing import Optional


RISK_THRESHOLDS = {
    "LOW": (0, 25),
    "MODERATE": (25, 50),
    "ELEVATED": (50, 75),
    "HIGH": (75, 100),
}


def compute_risk_score(
    displacement_mm: Optional[float] = None,
    displacement_velocity_mm_year: Optional[float] = None,
    rainfall_mm: Optional[float] = None,
    mining_activity_index: Optional[float] = None,
    anomaly_score: Optional[float] = None,   # normalized 0-1
) -> dict:
    """
    Compute a provisional risk index (0-100) using weighted factors.

    Weights are illustrative and NOT calibrated against real events.

    Factor breakdown (max 100 pts total):
      displacement_mm           → 0-30 pts  (>50 mm = 30 pts)
      displacement_velocity     → 0-25 pts  (>30 mm/yr = 25 pts)
      rainfall_mm               → 0-15 pts  (>300 mm = 15 pts)
      mining_activity_index     → 0-15 pts  (index=1 = 15 pts)
      anomaly_score (ML)        → 0-15 pts  (score=1 = 15 pts)

    Returns:
        dict with risk_score, risk_level, model_method, and per-factor values.
    """
    score = 0.0
    factors = {}

    # --- Displacement magnitude (0-30 pts) ---
    if displacement_mm is not None:
        d_factor = min(abs(displacement_mm) / 50.0, 1.0) * 30.0
        factors["displacement_factor"] = round(d_factor, 2)
        score += d_factor

    # --- Displacement velocity (0-25 pts) ---
    if displacement_velocity_mm_year is not None:
        v_factor = min(abs(displacement_velocity_mm_year) / 30.0, 1.0) * 25.0
        factors["velocity_factor"] = round(v_factor, 2)
        score += v_factor

    # --- Rainfall (0-15 pts) ---
    if rainfall_mm is not None:
        r_factor = min(rainfall_mm / 300.0, 1.0) * 15.0
        factors["rainfall_factor"] = round(r_factor, 2)
        score += r_factor

    # --- Mining activity (0-15 pts) ---
    if mining_activity_index is not None:
        m_factor = min(mining_activity_index, 1.0) * 15.0
        factors["mining_factor"] = round(m_factor, 2)
        score += m_factor

    # --- ML anomaly score (0-15 pts) ---
    if anomaly_score is not None:
        a_factor = min(anomaly_score, 1.0) * 15.0
        factors["anomaly_factor"] = round(a_factor, 2)
        score += a_factor

    score = min(score, 100.0)

    # Classify
    if score < 25:
        risk_level = "LOW"
    elif score < 50:
        risk_level = "MODERATE"
    elif score < 75:
        risk_level = "ELEVATED"
    else:
        risk_level = "HIGH"

    return {
        "risk_score": round(score, 2),
        "risk_level": risk_level,
        "model_method": "provisional_rule_based_index_v1",
        **factors,
    }
