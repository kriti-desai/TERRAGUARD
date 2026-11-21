"""
Dataset Routes – /datasets
Upload, list, detail, process, and sample-download endpoints.
"""
import os
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_user
from ..config import settings
from ..models import Dataset, DatasetStatus, Observation, Location, User
from ..schemas import DatasetOut, DatasetUploadResponse
from ..services.dataset_service import parse_csv, parse_geojson, build_validation_summary

router = APIRouter()
logger = logging.getLogger(__name__)

SAMPLE_CSV_PATH = Path(__file__).resolve().parents[2] / "datasets" / "sample_data" / "sample_observations.csv"


def _get_or_create_location(db: Session, lat: float, lon: float, name: str, region: str) -> Location:
    """
    Find an existing location within ~0.001° (~100 m) of the given coordinates,
    or create a new one.
    """
    existing = (
        db.query(Location)
        .filter(
            Location.latitude.between(lat - 0.001, lat + 0.001),
            Location.longitude.between(lon - 0.001, lon + 0.001),
        )
        .first()
    )
    if existing:
        return existing

    loc = Location(
        name=name or f"Location ({lat:.4f}, {lon:.4f})",
        latitude=lat,
        longitude=lon,
        region=region or None,
        mining_area=False,
    )
    db.add(loc)
    db.flush()   # get loc.id
    return loc


@router.post("/upload", response_model=DatasetUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Accept a multipart CSV or GeoJSON file upload.
    Saves to disk, parses, creates Location + Observation records,
    and returns a preview of the first 5 rows.
    """
    # --- Validate file type ---
    original_name = file.filename or "upload"
    ext = Path(original_name).suffix.lower().lstrip(".")
    if ext not in ("csv", "geojson", "json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV and GeoJSON files are supported.",
        )
    file_type = "csv" if ext == "csv" else "geojson"

    # --- Check file size ---
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    # --- Save file with sanitised basename ---
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    safe_basename = Path(original_name).name
    unique_name = f"{uuid.uuid4().hex}_{safe_basename}"
    save_path = upload_dir / unique_name
    save_path.write_bytes(contents)

    # --- Create Dataset record (status=UPLOADED) ---
    dataset = Dataset(
        filename=unique_name,
        original_filename=original_name,
        file_type=file_type,
        status=DatasetStatus.UPLOADED,
        uploaded_by=current_user.id,
    )
    db.add(dataset)
    db.flush()

    # --- Parse file ---
    errors = []
    try:
        if file_type == "csv":
            df, errors = parse_csv(str(save_path))
        else:
            df, errors = parse_geojson(str(save_path))
    except (ValueError, FileNotFoundError) as exc:
        dataset.status = DatasetStatus.FAILED
        dataset.upload_notes = str(exc)
        db.commit()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    # --- Persist Observations and resolve Locations ---
    valid_count = 0
    for _, row in df.iterrows():
        lat = float(row["latitude"])
        lon = float(row["longitude"])
        loc_name = str(row.get("location_name", "")) if "location_name" in row else ""
        region = str(row.get("region", "")) if "region" in row else ""

        location = _get_or_create_location(db, lat, lon, loc_name, region)

        obs_date = row.get("observation_date")
        if hasattr(obs_date, "to_pydatetime"):
            obs_date = obs_date.to_pydatetime()

        obs = Observation(
            dataset_id=dataset.id,
            location_id=location.id,
            observation_date=obs_date if obs_date and not str(obs_date) == "NaT" else None,
            latitude=lat,
            longitude=lon,
            displacement_mm=float(row["displacement_mm"]) if "displacement_mm" in row and row["displacement_mm"] == row["displacement_mm"] else None,
            displacement_velocity_mm_year=float(row["displacement_velocity_mm_year"]) if "displacement_velocity_mm_year" in row and row["displacement_velocity_mm_year"] == row["displacement_velocity_mm_year"] else None,
            rainfall_mm=float(row["rainfall_mm"]) if "rainfall_mm" in row and row["rainfall_mm"] == row["rainfall_mm"] else None,
            elevation_m=float(row["elevation_m"]) if "elevation_m" in row and row["elevation_m"] == row["elevation_m"] else None,
            mining_activity_index=float(row["mining_activity_index"]) if "mining_activity_index" in row and row["mining_activity_index"] == row["mining_activity_index"] else None,
        )
        db.add(obs)
        valid_count += 1

    # --- Update Dataset metadata ---
    dataset.status = DatasetStatus.PROCESSING
    dataset.total_records = len(df)
    dataset.valid_records = valid_count
    dataset.upload_notes = "; ".join(errors) if errors else "OK"
    db.commit()
    db.refresh(dataset)

    # --- Build preview (first 5 rows) ---
    preview_cols = [c for c in df.columns if c in [
        "latitude", "longitude", "observation_date", "displacement_mm",
        "displacement_velocity_mm_year", "rainfall_mm", "elevation_m",
        "mining_activity_index", "location_name", "region",
    ]]
    preview = df[preview_cols].head(5).fillna("").to_dict(orient="records")

    return DatasetUploadResponse(
        dataset=DatasetOut.model_validate(dataset),
        preview=preview,
        validation_errors=errors,
        total_records=len(df),
        valid_records=valid_count,
    )


@router.get("", response_model=list[DatasetOut])
def list_datasets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all datasets ordered by most recently uploaded."""
    return db.query(Dataset).order_by(Dataset.uploaded_at.desc()).all()


@router.get("/sample/download")
def download_sample(current_user: User = Depends(get_current_user)):
    """Stream the bundled sample CSV for the user to download."""
    if not SAMPLE_CSV_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sample CSV not found on server.",
        )
    return FileResponse(
        path=str(SAMPLE_CSV_PATH),
        media_type="text/csv",
        filename="terraguard_sample_observations.csv",
    )


@router.get("/{dataset_id}", response_model=DatasetOut)
def get_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return metadata for a single dataset."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")
    return dataset


@router.post("/{dataset_id}/process", response_model=DatasetOut)
def process_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark a dataset as PROCESSED and update its processed_at timestamp.
    Full ML analysis is triggered separately via /analysis/run.
    """
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")

    dataset.status = DatasetStatus.PROCESSED
    dataset.processed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(dataset)
    return dataset
