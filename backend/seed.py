"""
TERRAGUARD Database Seeder
Creates demo admin + analyst users, loads sample observations,
and runs the ML pipeline so the platform opens with rich, calculated intelligence.

Run: python seed.py
"""
import sys
import os
from pathlib import Path
from datetime import datetime, timezone

# Set python path to backend root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import User, UserRole, Dataset, DatasetStatus, Observation, Location
from app.auth import hash_password
from app.services.dataset_service import parse_csv
from app.services.analysis_service import run_full_analysis
from app.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("terraguard-seed")

def seed():
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    is_production = settings.ENVIRONMENT.lower() == "production"

    try:
        # 1. Admin User
        admin_email = (
            os.getenv("ADMIN_EMAIL")
            or os.getenv("INITIAL_ADMIN_EMAIL")
            or getattr(settings, "ADMIN_EMAIL", None)
            or getattr(settings, "INITIAL_ADMIN_EMAIL", "admin@terraguard.in")
        ).strip()
        admin_password = (
            os.getenv("ADMIN_PASSWORD")
            or os.getenv("INITIAL_ADMIN_PASSWORD")
            or getattr(settings, "ADMIN_PASSWORD", None)
            or getattr(settings, "INITIAL_ADMIN_PASSWORD", "")
        ).strip()

        admin = None

        if is_production:
            if admin_password in ("Admin@123", "admin123", "admin", "password"):
                logger.error(
                    "SECURITY REJECTION: Refusing to provision production admin with publicly documented default password! "
                    "Configure a secure INITIAL_ADMIN_PASSWORD / ADMIN_PASSWORD in your environment variables."
                )
            elif admin_password:
                admin = db.query(User).filter(User.email.ilike(admin_email)).first()
                if not admin:
                    admin = User(
                        email=admin_email,
                        full_name=os.getenv("ADMIN_NAME") or "TERRAGUARD Administrator",
                        hashed_password=hash_password(admin_password),
                        role=UserRole.ADMIN.value,
                    )
                    db.add(admin)
                    db.commit()
                    db.refresh(admin)
                    logger.info("Created production Admin User: %s using environment credentials.", admin_email)
                else:
                    logger.info("Admin user '%s' already exists in database.", admin_email)
            else:
                admin = db.query(User).filter(User.role == UserRole.ADMIN.value).first()
                if admin:
                    logger.info("Found existing admin user '%s' in database.", admin.email)
                else:
                    logger.warning(
                        "Production mode: No INITIAL_ADMIN_PASSWORD / ADMIN_PASSWORD provided and no admin found. "
                        "Skipping admin creation to avoid deploying default passwords."
                    )
        else:
            # Development mode: allow environment credentials or fallback to dev defaults for local testing
            dev_admin_email = admin_email or "admin@terraguard.in"
            dev_admin_password = admin_password or "Admin@123"
            admin = db.query(User).filter(User.email.ilike(dev_admin_email)).first()
            if not admin:
                admin = User(
                    email=dev_admin_email,
                    full_name="TERRAGUARD Administrator",
                    hashed_password=hash_password(dev_admin_password),
                    role=UserRole.ADMIN.value,
                )
                db.add(admin)
                db.commit()
                db.refresh(admin)
                logger.info("Created Development Admin User: %s", dev_admin_email)
            else:
                logger.info("Admin user '%s' already exists.", dev_admin_email)

        # 2. Analyst User (Development/demo only - skipped in production to avoid default passwords)
        if not is_production:
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
                logger.info("Created Development Analyst User: analyst@terraguard.in")
            else:
                logger.info("Analyst user already exists.")
        else:
            logger.info("Production mode: Skipping default demonstration analyst account creation.")

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
                uploaded_by=admin.id if admin else None,
                processed_at=datetime.now(timezone.utc),
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
            if admin:
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
                logger.info("Skipping automatic initial ML analysis: no admin account available yet.")
        else:
            logger.info("Sample dataset already present or file missing.")

        logger.info("✅ Database seeding successfully completed!")

    except Exception as exc:
        db.rollback()
        logger.error("Error during database seed: %s", exc, exc_info=True)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
