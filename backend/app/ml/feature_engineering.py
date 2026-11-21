"""
Feature Engineering for TERRAGUARD ML Pipeline
Prepares observation data for Isolation Forest anomaly detection.
"""
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

FEATURE_COLUMNS = [
    "displacement_mm",
    "displacement_velocity_mm_year",
    "rainfall_mm",
    "elevation_m",
    "mining_activity_index",
]


def engineer_features(df: pd.DataFrame) -> tuple:
    """
    Prepare features for the ML model.

    Steps:
    1. Keep only columns that actually exist in df.
    2. Compute a 'displacement_change' (first-order delta) per georeferenced location.
    3. Impute missing values with column medians (or 0 for all-null columns).
    4. Z-score standardise all features so each dimension contributes appropriately.

    Returns:
        (feature_df, list_of_used_feature_names)
    """
    available = [c for c in FEATURE_COLUMNS if c in df.columns]

    # Engineered feature: first-order difference of displacement partitioned by location
    if "displacement_mm" in df.columns and len(df) > 1:
        working = df.copy()
        if "location_id" in working.columns and working["location_id"].nunique() > 1:
            sort_cols = ["location_id", "observation_date"] if "observation_date" in working.columns else ["location_id"]
            working = working.sort_values(sort_cols)
            working["displacement_change"] = working.groupby("location_id")["displacement_mm"].diff().fillna(0.0)
        elif "latitude" in working.columns and "longitude" in working.columns:
            sort_cols = ["latitude", "longitude", "observation_date"] if "observation_date" in working.columns else ["latitude", "longitude"]
            working = working.sort_values(sort_cols)
            working["displacement_change"] = working.groupby(["latitude", "longitude"])["displacement_mm"].diff().fillna(0.0)
        else:
            sort_col = "observation_date" if "observation_date" in working.columns else None
            working = working.sort_values(sort_col) if sort_col else working
            working["displacement_change"] = working["displacement_mm"].diff().fillna(0.0)
        
        df = working.sort_index()
        available.append("displacement_change")

    feature_df = df[available].copy()

    # Pre-fill columns that are completely null to prevent SimpleImputer failure
    for col in available:
        if feature_df[col].isna().all():
            feature_df[col] = 0.0

    # Impute remaining NaNs with column median
    imputer = SimpleImputer(strategy="median")
    feature_df[available] = imputer.fit_transform(feature_df[available])

    # Standardise so all features contribute equally
    scaler = StandardScaler()
    feature_df[available] = scaler.fit_transform(feature_df[available])

    return feature_df, available
