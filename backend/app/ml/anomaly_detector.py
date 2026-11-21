"""
Isolation Forest Anomaly Detection for TERRAGUARD
Detects unusual ground deformation patterns.

DISCLAIMER: Anomaly scores indicate statistical deviation from typical patterns
in the dataset. They do NOT directly predict subsidence events or geological hazards.
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from .feature_engineering import engineer_features
import logging

logger = logging.getLogger(__name__)


def run_anomaly_detection(df: pd.DataFrame, contamination: float = 0.1) -> dict:
    """
    Run Isolation Forest on the observation dataframe.

    Args:
        df:            DataFrame with observation columns from the DB.
        contamination: Expected fraction of anomalies (0.01 – 0.5).

    Returns:
        dict with keys:
            predictions        – raw sklearn labels (+1 normal, -1 anomaly)
            raw_scores         – raw decision_function values
            normalized_scores  – 0 (normal) to 1 (most anomalous)
            is_anomaly         – boolean list
            feature_names      – list of feature columns used
            total / anomalies / normal – counts
    """
    if len(df) < 5:
        raise ValueError("Need at least 5 observations to run anomaly detection.")

    feature_df, feature_names = engineer_features(df.copy())

    if feature_df.empty or len(feature_names) == 0:
        raise ValueError("No valid numeric features found in dataset.")

    model = IsolationForest(
        n_estimators=100,
        contamination=contamination,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(feature_df[feature_names])

    # sklearn: -1 = anomaly, +1 = normal
    predictions = model.predict(feature_df[feature_names])
    # decision_function: more negative → more anomalous
    scores = model.decision_function(feature_df[feature_names])

    is_anomaly = predictions == -1

    # Normalise to [0, 1] where 1 means most anomalous
    min_s, max_s = scores.min(), scores.max()
    if max_s > min_s:
        normalized_scores = 1.0 - (scores - min_s) / (max_s - min_s)
    else:
        normalized_scores = np.zeros(len(scores))

    logger.info(
        "Anomaly detection complete: %d total, %d anomalies (contamination=%.2f)",
        len(df), int(is_anomaly.sum()), contamination,
    )

    return {
        "predictions": predictions.tolist(),
        "raw_scores": scores.tolist(),
        "normalized_scores": normalized_scores.tolist(),
        "is_anomaly": is_anomaly.tolist(),
        "feature_names": feature_names,
        "total": len(df),
        "anomalies": int(is_anomaly.sum()),
        "normal": int((~is_anomaly).sum()),
    }
