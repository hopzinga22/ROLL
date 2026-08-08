"""
config.py — central place for environment-driven settings.

Reads from a .env file at the project root. You said you already have one
with your ImageKit keys — just make sure it also has DATABASE_URL and
JWT_SECRET_KEY (see .env.example for the full list).
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./roll.db"

    # JWT
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 day

    # ImageKit
    imagekit_public_key: str
    imagekit_private_key: str
    imagekit_url_endpoint: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    """Cached so we only parse .env once per process."""
    return Settings()
