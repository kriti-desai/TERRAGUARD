import pytest
from datetime import datetime
from app.models import (
    User, UserRole, Location, Observation, Dataset,
    DatasetStatus, AnalysisRun, AnomalyResult, RiskAssessment, Alert
)

def test_user_creation_and_fields(db_session):
    """Test user ORM persistence and defaults."""
    user = User(
        email="db_user@terraguard.in",
        full_name="Database User",
        hashed_password="some_hashed_string",
        role=UserRole.ANALYST.value,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert user.id is not None
    assert user.role == "analyst"
    assert user.is_active is True
    assert user.created_at is not None


def test_location_and_observation_relationship(db_session, test_analyst_user):
    """Test location creation and observation foreign key association."""
    loc = Location(
        name="Jharia Sector 4 Shaft",
        latitude=23.7512,
        longitude=86.4189,
        region="Jharia Coalfield",
        state="Jharkhand",
        elevation_m=225.5,
        mining_area=True,
    )
    db_session.add(loc)
    db_session.commit()
    db_session.refresh(loc)

    dataset = Dataset(
        filename="test_run.csv",
        original_filename="survey_2024.csv",
        file_type="csv",
        status=DatasetStatus.PROCESSED.value,
        total_records=1,
        valid_records=1,
        uploaded_by=test_analyst_user.id,
    )
    db_session.add(dataset)
    db_session.commit()
    db_session.refresh(dataset)

    obs = Observation(
        location_id=loc.id,
        dataset_id=dataset.id,
        observation_date=datetime(2024, 1, 15),
        latitude=loc.latitude,
        longitude=loc.longitude,
        displacement_mm=-24.5,
        displacement_velocity_mm_year=-18.2,
        rainfall_mm=65.0,
        elevation_m=loc.elevation_m,
        mining_activity_index=0.85,
    )
    db_session.add(obs)
    db_session.commit()
    db_session.refresh(obs)

    assert obs.id is not None
    assert obs.location.name == "Jharia Sector 4 Shaft"
    assert len(loc.observations) == 1
    assert loc.observations[0].displacement_mm == -24.5


def test_risk_assessment_and_alert_generation(db_session):
    """Test risk assessment association and alert creation."""
    loc = Location(
        name="Bokaro Open Pit",
        latitude=23.7850,
        longitude=85.9620,
        region="Bokaro",
        state="Jharkhand",
    )
    db_session.add(loc)
    db_session.commit()

    ra = RiskAssessment(
        location_id=loc.id,
        risk_level="HIGH",
        risk_score=82.5,
        displacement_factor=28.0,
        velocity_factor=22.0,
        rainfall_factor=10.0,
        mining_factor=12.5,
        anomaly_factor=10.0,
        model_method="provisional_rule_based_index_v1",
    )
    db_session.add(ra)
    db_session.commit()
    db_session.refresh(ra)

    alert = Alert(
        location_id=loc.id,
        risk_level=ra.risk_level,
        title=f"CRITICAL: High Subsidence at {loc.name}",
        description=f"Risk Score {ra.risk_score}/100 exceeds critical threshold.",
    )
    db_session.add(alert)
    db_session.commit()
    db_session.refresh(alert)

    assert alert.id is not None
    assert alert.location_id == loc.id
    assert alert.risk_level == "HIGH"
    assert alert.status == "NEW"


def test_normalize_database_url_postgresql_variants():
    """Verify normalize_database_url handles all PostgreSQL and Render URL patterns."""
    from app.database import normalize_database_url

    # Legacy Render/Heroku postgres:// URL
    render_url = "postgres://tg_user:tg_pass@dpg-abc123-a.oregon-postgres.render.com/tg_db"
    normalized = normalize_database_url(render_url)
    assert normalized.startswith("postgresql+psycopg2://")
    assert "tg_user:tg_pass" in normalized

    # Standard postgresql:// URL without driver
    pg_url = "postgresql://tg_user:tg_pass@localhost:5432/tg_db"
    normalized_pg = normalize_database_url(pg_url)
    assert normalized_pg.startswith("postgresql+psycopg2://")

    # Already explicit postgresql+psycopg2:// URL
    explicit_url = "postgresql+psycopg2://tg_user:tg_pass@localhost:5432/tg_db"
    assert normalize_database_url(explicit_url) == explicit_url

    # SQLite URL preserved
    sqlite_url = "sqlite:///./terraguard.db"
    assert normalize_database_url(sqlite_url) == sqlite_url

    # Whitespace stripping
    assert normalize_database_url("  postgresql://user:pw@host/db  ") == "postgresql+psycopg2://user:pw@host/db"


def test_seed_production_disallows_default_password(monkeypatch, db_session):
    """Verify seed() in production refuses to create accounts with default passwords."""
    import sys
    import os
    backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)
    import seed
    from tests.conftest import TestingSessionLocal, test_engine
    from app.config import settings

    monkeypatch.setattr(seed, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(seed, "engine", test_engine)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setenv("INITIAL_ADMIN_PASSWORD", "Admin@123")
    monkeypatch.setenv("INITIAL_ADMIN_EMAIL", "prod_admin_reject@terraguard.in")

    seed.seed()

    user = db_session.query(User).filter(User.email == "prod_admin_reject@terraguard.in").first()
    assert user is None


def test_seed_production_with_secure_password(monkeypatch, db_session):
    """Verify seed() in production succeeds with secure environment credentials."""
    import sys
    import os
    backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)
    import seed
    from tests.conftest import TestingSessionLocal, test_engine
    from app.config import settings
    from app.auth import verify_password

    monkeypatch.setattr(seed, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(seed, "engine", test_engine)
    secure_pass = "VerySecureRand#987654321!"
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setenv("INITIAL_ADMIN_PASSWORD", secure_pass)
    monkeypatch.setenv("INITIAL_ADMIN_EMAIL", "secure_admin@terraguard.in")

    seed.seed()

    user = db_session.query(User).filter(User.email == "secure_admin@terraguard.in").first()
    assert user is not None
    assert user.role == "admin"
    assert verify_password(secure_pass, user.hashed_password)
    # Default analyst should NOT be created in production
    analyst = db_session.query(User).filter(User.email == "analyst@terraguard.in").first()
    assert analyst is None


def test_seed_reraises_on_exception(monkeypatch):
    """Verify seed() re-raises exceptions so failures exit with non-zero status."""
    import sys
    import os
    backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)
    import seed
    from tests.conftest import TestingSessionLocal, test_engine

    def mock_failing_session():
        session = TestingSessionLocal()
        session.query = lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("Simulated database failure during seeding"))
        return session

    monkeypatch.setattr(seed, "SessionLocal", mock_failing_session)
    monkeypatch.setattr(seed, "engine", test_engine)

    with pytest.raises(RuntimeError, match="Simulated database failure during seeding"):
        seed.seed()
