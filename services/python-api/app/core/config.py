"""
Application configuration using pydantic-settings.
Loads from environment variables and .env files based on APP_ENV.
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central settings object — all env vars live here.
    Development values come from .env.development, production from .env.production.
    """
    model_config = SettingsConfigDict(
        env_file=f".env.{os.getenv('APP_ENV', 'development')}",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "TaxWise AI Python API"
    app_version: str = "1.0.0"
    app_env: str = "development"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 1

    # Database
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/taxwise"
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_timeout: int = 30

    # Redis cache
    redis_url: str = "redis://localhost:6379/0"
    cache_ttl_seconds: int = 300

    # Security
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # OpenRouter AI
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    default_model: str = "google/gemini-flash-1.5"

    # LLM service
    llm_service_url: str = "http://llm-service:9000"

    # CORS — stored as a plain string to avoid JSON-parsing issues with "*"
    # Use comma-separated origins: "https://app.com,https://api.com" or "*"
    cors_origins: str = "*"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins string into a list."""
        raw = self.cors_origins.strip()
        if raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached singleton Settings instance."""
    return Settings()
