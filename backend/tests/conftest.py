import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app.models import User, UserRole, Location, Observation, RiskAssessment, Alert, Dataset, DatasetStatus
from app.auth import hash_password, create_access_token

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine, expire_on_commit=False)


@pytest.fixture(autouse=True)
def setup_test_db():
    """Create all tables in memory before each test and drop after."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    """Yield a fresh session per test."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    """FastAPI TestClient with overridden get_db dependency."""
    def _override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_admin_user(db_session):
    """Create a persistent admin user for testing."""
    user = User(
        email="test_admin@terraguard.in",
        full_name="Test Administrator",
        hashed_password=hash_password("AdminPass@123"),
        role=UserRole.ADMIN.value,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_analyst_user(db_session):
    """Create a persistent analyst user for testing."""
    user = User(
        email="test_analyst@terraguard.in",
        full_name="Test Lead Analyst",
        hashed_password=hash_password("AnalystPass@123"),
        role=UserRole.ANALYST.value,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_headers(test_admin_user):
    token = create_access_token({"sub": str(test_admin_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def analyst_headers(test_analyst_user):
    token = create_access_token({"sub": str(test_analyst_user.id)})
    return {"Authorization": f"Bearer {token}"}
