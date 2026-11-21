"""
Dataset Parsing Service for TERRAGUARD
Handles CSV and GeoJSON ingestion with validation.
"""
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, List
import logging

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = ["latitude", "longitude", "observation_date", "displacement_mm"]
OPTIONAL_COLUMNS = [
    "displacement_velocity_mm_year",
    "rainfall_mm",
    "elevation_m",
    "mining_activity_index",
    "location_name",
    "region",
]
ALL_EXPECTED = REQUIRED_COLUMNS + OPTIONAL_COLUMNS


def validate_lat_lon(df: pd.DataFrame, errors: List[str]) -> pd.DataFrame:
    """
    Remove rows with invalid lat/lon values and append error messages.
    Valid lat: -90 to 90, Valid lon: -180 to 180.
    """
    before = len(df)
    mask = (
        df["latitude"].between(-90, 90)
        & df["longitude"].between(-180, 180)
    )
    invalid = (~mask).sum()
    if invalid > 0:
        errors.append(
            f"{invalid} rows removed: latitude/longitude out of valid range."
        )
    return df[mask].copy()


def parse_csv(file_path: str) -> Tuple[pd.DataFrame, List[str]]:
    """
    Read a CSV file, validate required columns and coordinate ranges.

    Returns:
        (cleaned DataFrame, list of validation error/warning messages)
    """
    errors: List[str] = []
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    # Skip comment lines starting with '#'
    try:
        df = pd.read_csv(
            file_path,
            comment="#",
            on_bad_lines="warn",
        )
    except Exception as exc:
        raise ValueError(f"Could not parse CSV: {exc}") from exc

    # Normalise column names
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    # Check required columns
    missing_required = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_required:
        raise ValueError(
            f"CSV is missing required columns: {missing_required}. "
            f"Found columns: {list(df.columns)}"
        )

    # Report optional columns presence
    present_optional = [c for c in OPTIONAL_COLUMNS if c in df.columns]
    absent_optional = [c for c in OPTIONAL_COLUMNS if c not in df.columns]
    if absent_optional:
        errors.append(
            f"Optional columns not present (will be treated as null): {absent_optional}"
        )

    # Coerce numeric columns
    numeric_cols = [
        "latitude", "longitude", "displacement_mm",
        "displacement_velocity_mm_year", "rainfall_mm",
        "elevation_m", "mining_activity_index",
    ]
    for col in numeric_cols:
        if col in df.columns:
            before_count = df[col].notna().sum()
            df[col] = pd.to_numeric(df[col], errors="coerce")
            after_count = df[col].notna().sum()
            coerced = before_count - after_count
            if coerced > 0:
                errors.append(f"Column '{col}': {coerced} non-numeric values set to null.")

    # Parse dates
    if "observation_date" in df.columns:
        df["observation_date"] = pd.to_datetime(df["observation_date"], errors="coerce")
        null_dates = df["observation_date"].isna().sum()
        if null_dates > 0:
            errors.append(f"{null_dates} rows have unparseable observation_date (set to null).")

    # Drop rows with no lat/lon at all
    before = len(df)
    df = df.dropna(subset=["latitude", "longitude"])
    dropped = before - len(df)
    if dropped > 0:
        errors.append(f"{dropped} rows dropped: missing latitude or longitude.")

    # Validate coordinate ranges
    df = validate_lat_lon(df, errors)

    # Validate mining_activity_index range 0-1
    if "mining_activity_index" in df.columns:
        out_range = df["mining_activity_index"].dropna()
        invalid_mai = ((out_range < 0) | (out_range > 1)).sum()
        if invalid_mai > 0:
            df["mining_activity_index"] = df["mining_activity_index"].clip(0, 1)
            errors.append(
                f"{invalid_mai} mining_activity_index values clipped to [0, 1]."
            )

    logger.info(
        "CSV parsed: %d total rows, %d valid rows, %d errors/warnings",
        before, len(df), len(errors),
    )
    return df, errors


def parse_geojson(file_path: str) -> Tuple[pd.DataFrame, List[str]]:
    """
    Read a GeoJSON FeatureCollection and extract observation data.
    Each Feature's properties become a row; geometry coordinates
    populate latitude and longitude.

    Returns:
        (DataFrame, list of validation messages)
    """
    errors: List[str] = []

    try:
        import geopandas as gpd
        gdf = gpd.read_file(file_path)
    except Exception as exc:
        raise ValueError(f"Could not parse GeoJSON: {exc}") from exc

    if gdf.empty:
        raise ValueError("GeoJSON file contains no features.")

    # Extract coordinates from geometry
    gdf = gdf.copy()
    gdf["longitude"] = gdf.geometry.x
    gdf["latitude"] = gdf.geometry.y

    # Drop geometry column – convert to plain DataFrame
    df = pd.DataFrame(gdf.drop(columns="geometry"))

    # Normalise column names
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    # Check required columns (date and displacement may be in properties)
    missing = [c for c in ["latitude", "longitude"] if c not in df.columns]
    if missing:
        raise ValueError(f"GeoJSON missing required geometry columns: {missing}")

    if "displacement_mm" not in df.columns:
        errors.append(
            "displacement_mm not found in GeoJSON properties; column will be null."
        )

    if "observation_date" in df.columns:
        df["observation_date"] = pd.to_datetime(df["observation_date"], errors="coerce")
    else:
        errors.append("observation_date not in GeoJSON properties; will be null.")

    df = validate_lat_lon(df, errors)

    logger.info("GeoJSON parsed: %d features, %d warnings", len(df), len(errors))
    return df, errors


def build_validation_summary(df: pd.DataFrame, errors: List[str]) -> dict:
    """Return a concise validation summary dictionary."""
    return {
        "total_records": len(df),
        "null_displacement": int(df["displacement_mm"].isna().sum()) if "displacement_mm" in df.columns else 0,
        "null_date": int(df["observation_date"].isna().sum()) if "observation_date" in df.columns else 0,
        "unique_locations": int(df[["latitude", "longitude"]].drop_duplicates().shape[0]),
        "warnings": errors,
    }
