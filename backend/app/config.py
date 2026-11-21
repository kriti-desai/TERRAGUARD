from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
import os

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_FILE = BACKEND_DIR / "terraguard.db"

class Settings(BaseSettings):
    SECRET_KEY: str = "dev-secret-key-change-in-production-terraguard-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours for dev comfort
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB_FILE.as_posix()}"
    UPLOAD_DIR: str = str(BACKEND_DIR / "uploads")
    MAX_UPLOAD_SIZE_MB: int = 50
    CORS_ORIGINS: str = "*"
    ENVIRONMENT: str = "development"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
