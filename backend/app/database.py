from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

def normalize_database_url(url: str) -> str:
    """
    Normalizes database URLs for SQLAlchemy.
    - Handles Render/Heroku legacy 'postgres://' URLs.
    - Ensures PostgreSQL URLs explicitly use the 'postgresql+psycopg2://' driver.
    - Preserves SQLite and already-specified driver URLs (e.g., 'postgresql+psycopg2://').
    """
    clean_url = (url or "").strip()
    if clean_url.startswith("postgres://"):
        return clean_url.replace("postgres://", "postgresql+psycopg2://", 1)
    if clean_url.startswith("postgresql://") and not clean_url.startswith("postgresql+"):
        return clean_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return clean_url


# Normalize database URL and configure connection arguments
db_url = normalize_database_url(settings.DATABASE_URL)
connect_args = {"check_same_thread": False} if "sqlite" in db_url else {}

engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and ensures it is closed after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
