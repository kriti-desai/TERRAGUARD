"""
TERRAGUARD Database Seeder
Creates demo admin + analyst users, loads sample observations,
and runs the ML pipeline so the platform opens with rich, calculated intelligence.

Run: python seed.py
"""
import sys
import os
from pathlib import Path
from datetime import datetime

# Set python path to backend root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import User, UserRole, Dataset, DatasetStatus, Observation, Location
from app.auth import hash_password
from app.services.dataset_service import parse_csv
from app.services.analysis_service import run_full_analysis
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("terraguard-seed")

def seed():
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # 1. Admin User
        admin = db.query(User).filter(User.email == "admin@terraguard.in").first()
        if not admin:
            admin = User(
                email="admin@terraguard.in",
                full_name="TERRAGUARD Administrator",
                hashed_password=hash_password("Admin@123"),
                role=UserRole.ADMIN.value,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            logger.info("Created Admin User: admin@terraguard.in / Admin@123")
        else:
            logger.info("Admin user already exists.")

        # 2. Analyst User
        analyst = db.query(User).filter(User.email == "analyst@terraguard.in").first()
        if not analyst:
            analyst = User(
                email="analyst@terraguard.in",
                full_name="Lead Geodesy Analyst",
                hashed_password=hash_password("Analyst@123"),
                role=UserRole.ANALYST.value,
            )
            db.add(analyst)
            db.commit()
            db.refresh(analyst)
            logger.info("Created Analyst User: analyst@terraguard.in / Analyst@123")
        else:
            logger.info("Analyst user already exists.")

        # 3. Ingest Sample Dataset if not already present
        sample_csv = Path(__file__).resolve().parent / "datasets" / "sample_data" / "sample_observations.csv"
        existing_dataset = db.query(Dataset).filter(Dataset.original_filename == "sample_observations.csv").first()
        
        if not existing_dataset and sample_csv.exists():
            logger.info("Loading initial demonstration dataset: %s", sample_csv.name)
            df, errors = parse_csv(str(sample_csv))
            
            dataset = Dataset(
                filename="sample_observations.csv",
                original_filename="sample_observations.csv",
                file_type="csv",
                status=DatasetStatus.PROCESSED.value,
                total_records=len(df),
                valid_records=len(df),
                upload_notes="Initial bundled demonstration dataset (Jharkhand & Odisha Coal/Mineral Belts)",
                uploaded_by=admin.id,
                processed_at=datetime.utcnow(),
            )
            db.add(dataset)
            db.flush()

            # Create locations and observations
            for _, row in df.iterrows():
                lat = float(row["latitude"])
                lon = float(row["longitude"])
                name = str(row.get("location_name", f"Loc ({lat:.4f}, {lon:.4f})"))
                region = str(row.get("region", "Coal Belt"))

                # Match location by proximity
                loc = (
                    db.query(Location)
                    .filter(
                        Location.latitude.between(lat - 0.001, lat + 0.001),
                        Location.longitude.between(lon - 0.001, lon + 0.001),
                    )
                    .first()
                )
                if not loc:
                    loc = Location(
                        name=name,
                        latitude=lat,
                        longitude=lon,
                        region=region,
                        state="Jharkhand" if "Dhanbad" in region or "Bokaro" in region or "Ramgarh" in region or "Giridih" in region or "Hazaribagh" in region or "Singhbhum" in region else ("Odisha" if "Angul" in region or "Jajpur" in region or "Keonjhar" in region else "Central India"),
                        elevation_m=float(row["elevation_m"]) if "elevation_m" in row and row["elevation_m"] == row["elevation_m"] else 220.0,
                        mining_area=True,
                    )
                    db.add(loc)
                    db.flush()

                obs_date = row.get("observation_date")
                if hasattr(obs_date, "to_pydatetime"):
                    obs_date = obs_date.to_pydatetime()

                obs = Observation(
                    dataset_id=dataset.id,
                    location_id=loc.id,
                    observation_date=obs_date if obs_date and str(obs_date) != "NaT" else None,
                    latitude=lat,
                    longitude=lon,
                    displacement_mm=float(row["displacement_mm"]) if "displacement_mm" in row and row["displacement_mm"] == row["displacement_mm"] else None,
                    displacement_velocity_mm_year=float(row["displacement_velocity_mm_year"]) if "displacement_velocity_mm_year" in row and row["displacement_velocity_mm_year"] == row["displacement_velocity_mm_year"] else None,
                    rainfall_mm=float(row["rainfall_mm"]) if "rainfall_mm" in row and row["rainfall_mm"] == row["rainfall_mm"] else None,
                    elevation_m=float(row["elevation_m"]) if "elevation_m" in row and row["elevation_m"] == row["elevation_m"] else None,
                    mining_activity_index=float(row["mining_activity_index"]) if "mining_activity_index" in row and row["mining_activity_index"] == row["mining_activity_index"] else None,
                )
                db.add(obs)

            db.commit()
            logger.info("Saved %d observations across locations into dataset #%d", len(df), dataset.id)

            # 4. Run ML Analysis pipeline on the dataset
            logger.info("Executing initial AI anomaly detection and risk scoring pipeline...")
            analysis_summary = run_full_analysis(
                dataset_id=dataset.id,
                user_id=admin.id,
                contamination=0.15,
                db=db,
            )
            logger.info(
                "Analysis complete: %d anomalies detected, %d locations assessed, %d alerts generated.",
                analysis_summary["anomalies_detected"],
                analysis_summary["locations_assessed"],
                analysis_summary["alerts_created"],
            )
        else:
            logger.info("Sample dataset already present or file missing.")

        logger.info("✅ Database seeding successfully completed!")

    except Exception as exc:
        db.rollback()
        logger.error("Error during database seed: %s", exc, exc_info=True)
    finally:
        db.close()

if __name__ == "__main__":
    seed()
