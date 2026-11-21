import pytest
import pandas as pd
import numpy as np

from app.ml.anomaly_detector import run_anomaly_detection
from app.ml.feature_engineering import engineer_features
from app.ml.risk_classifier import compute_risk_score

def test_feature_engineering_pipeline():
    """Verify feature preprocessing, delta engineering, median imputation, and scaling."""
    df = pd.DataFrame({
        "location_id": [1, 1, 1, 2, 2, 2],
        "observation_date": [
            "2023-01-01", "2023-02-01", "2023-03-01",
            "2023-01-01", "2023-02-01", "2023-03-01"
        ],
        "displacement_mm": [-10.0, -15.0, -25.0, -5.0, -8.0, -12.0],
        "displacement_velocity_mm_year": [-12.0, -18.0, np.nan, -6.0, -10.0, -14.0],
        "rainfall_mm": [20.0, 50.0, 120.0, 15.0, 45.0, 110.0],
        "mining_activity_index": [0.8, 0.85, 0.9, 0.4, 0.45, 0.5],
        "elevation_m": [220.0, 219.0, 217.0, 280.0, 279.0, 278.0],
    })

    feature_df, used_features = engineer_features(df)

    assert "displacement_mm" in used_features
    assert "displacement_change" in used_features
    assert not feature_df.isna().any().any()
    assert len(feature_df) == 6


def test_isolation_forest_anomaly_detector():
    """Verify Isolation Forest anomaly detector identifies outliers and normalizes scores."""
    # Create dataset with mostly stable points and a few extreme anomalies
    np.random.seed(42)
    n = 30
    normal_disp = np.random.normal(-5.0, 2.0, n)
    anomaly_disp = np.array([-85.0, -92.0, -110.0]) # extreme outliers

    all_disp = np.concatenate([normal_disp, anomaly_disp])
    total = len(all_disp)

    df = pd.DataFrame({
        "displacement_mm": all_disp,
        "displacement_velocity_mm_year": all_disp * 0.8,
        "rainfall_mm": np.random.uniform(10, 100, total),
        "mining_activity_index": np.random.uniform(0.1, 0.9, total),
        "elevation_m": np.random.uniform(200, 300, total),
    })

    result = run_anomaly_detection(df, contamination=0.1)

    assert result["total"] == total
    assert result["anomalies"] > 0
    assert len(result["normalized_scores"]) == total
    # Check that scores are normalized between 0 and 1
    for s in result["normalized_scores"]:
        assert 0.0 <= s <= 1.0

    # The extreme outlier points (last 3) should have higher anomaly scores
    outlier_scores = result["normalized_scores"][-3:]
    normal_sample_scores = result["normalized_scores"][:5]
    assert np.mean(outlier_scores) > np.mean(normal_sample_scores)


def test_transparent_risk_score_calculation():
    """Verify transparent additive risk classification logic and threshold boundaries."""
    # 1. Low risk scenario
    low_res = compute_risk_score(
        displacement_mm=-5.0,
        displacement_velocity_mm_year=-4.0,
        rainfall_mm=25.0,
        mining_activity_index=0.2,
        anomaly_score=0.1,
    )
    assert low_res["risk_level"] == "LOW"
    assert low_res["risk_score"] < 25.0
    assert "displacement_factor" in low_res
    assert "velocity_factor" in low_res

    # 2. Moderate risk scenario
    mod_res = compute_risk_score(
        displacement_mm=-25.0,
        displacement_velocity_mm_year=-15.0,
        rainfall_mm=100.0,
        mining_activity_index=0.5,
        anomaly_score=0.3,
    )
    assert mod_res["risk_level"] in ("MODERATE", "ELEVATED")
    assert 25.0 <= mod_res["risk_score"] <= 75.0

    # 3. High risk scenario (extreme subsidence, high rainfall & mining)
    high_res = compute_risk_score(
        displacement_mm=-65.0,       # > 50mm -> 30 pts
        displacement_velocity_mm_year=-45.0, # > 30mm/yr -> 25 pts
        rainfall_mm=350.0,           # > 300mm -> 15 pts
        mining_activity_index=1.0,   # -> 15 pts
        anomaly_score=1.0,           # -> 15 pts
    )
    assert high_res["risk_level"] == "HIGH"
    assert high_res["risk_score"] == 100.0 # capped at 100
    assert high_res["displacement_factor"] == 30.0
    assert high_res["velocity_factor"] == 25.0
    assert high_res["rainfall_factor"] == 15.0
    assert high_res["mining_factor"] == 15.0
    assert high_res["anomaly_factor"] == 15.0
