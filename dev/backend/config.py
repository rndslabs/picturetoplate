from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # Anthropic
    anthropic_api_key: str
    anthropic_model: str = "claude-opus-4-5"

    # App
    app_env: str = "development"
    app_secret_key: str

    # CORS
    frontend_origin: str = "http://localhost:5173"

    # Rate limiting
    rate_limit_rpm: int = 20

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    """Cached settings — reads .env once at startup."""
    return Settings()
