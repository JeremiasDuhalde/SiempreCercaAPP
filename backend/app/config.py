from functools import lru_cache
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v

    app_name: str = "SiempreCerca API"
    app_version: str = "0.1.0"
    debug: bool = False

    # Base de datos (PostGIS)
    database_url: str = "postgresql+asyncpg://siemprecerca:siemprecerca_dev@db:5432/siemprecerca"

    # Redis (cache + broker Celery + pub/sub)
    redis_url: str = "redis://redis:6379/0"

    # JWT
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    jwt_refresh_expire_days: int = 7

    # Admin inicial
    admin_email: str = "admin@siemprecerca.app"
    admin_password: str = "change-me"

    # CORS
    cors_origins: list[str] = ["http://localhost:5176", "http://localhost:3000"]

    # URLs publicas
    frontend_url: str = "http://localhost:5176"
    backend_public_url: str = "http://localhost:8300"

    # Media
    media_dir: str = "/app/media"
    media_url_prefix: str = "/media"

    # Webhook (Javier)
    webhook_secret: str = "change-me-webhook-secret"

    # WhatsApp
    whatsapp_provider: str = "mock"  # "meta" | "mock"
    whatsapp_token: str = ""
    whatsapp_phone_id: str = ""
    whatsapp_verify_token: str = ""

    # Anthropic (IA)
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"

    # Odoo (internacion domiciliaria)
    odoo_url: str = "https://siempre-cerca-srl.odoo.com"
    odoo_db: str = "siempre-cerca-srl"
    odoo_user: str = "administracion@siemprecercasrl.com"
    odoo_password: str = ""

    # Sentry (opcional)
    sentry_dsn: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
