from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve dev/.env regardless of the working directory uvicorn is started from.
_ENV_FILE = Path(__file__).parent.parent.parent.parent / ".env"


class Settings(BaseSettings):
    # Anthropic
    anthropic_api_key: str
    anthropic_model: str = "claude-sonnet-4-6"

    # App
    app_env: str = "development"
    app_secret_key: str

    # Database — asyncpg driver required
    # Format: postgresql+asyncpg://user:password@host:port/dbname
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/picturetoplate"

    # Supabase (used by mobile/frontend SDKs; backend uses database_url directly)
    supabase_url: str = ""
    supabase_anon_key: str = ""

    # Object storage (Supabase Storage bucket name)
    storage_bucket: str = "pantry-images"

    # CORS
    frontend_origin: str = "http://localhost:5173"

    # Rate limiting
    rate_limit_rpm: int = 20

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
