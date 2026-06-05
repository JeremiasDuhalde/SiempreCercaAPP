from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "SiempreCerca API"
    app_version: str = "0.1.0"
    debug: bool = False

    database_url: str = "postgresql+asyncpg://siemprecerca:siemprecerca_dev@db:5432/siemprecerca"
    redis_url: str = "redis://redis:6379/0"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    admin_email: str = "admin@siemprecerca.app"
    admin_password: str = "change-me"

    cors_origins: list[str] = ["http://localhost:5176"]

    frontend_url: str = "http://localhost:5176"
    backend_public_url: str = "http://localhost:8300"

    media_dir: str = "/app/media"
    media_url_prefix: str = "/media"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
