import logging
from contextlib import asynccontextmanager
from pathlib import Path

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from app.database import dispose_engine
from app.routers import alerts, appointments, auth, autorizaciones, clients, config, costs, dispatch, health, local_templates, messages, prestadores, tasks, templates, users, webhooks, wellbeing, ws

logging.basicConfig(level=logging.INFO)

# Sentry — monitoreo de errores (solo si hay DSN configurado)
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0.2,
        environment="production" if not settings.debug else "development",
    )

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await dispose_engine()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
    lifespan=lifespan,
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Demasiadas solicitudes. Intenta de nuevo en unos segundos."},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Static media
media_path = Path(settings.media_dir)
media_path.mkdir(parents=True, exist_ok=True)
app.mount(settings.media_url_prefix, StaticFiles(directory=str(media_path)), name="media")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(webhooks.router)
app.include_router(ws.router)
app.include_router(clients.router)
app.include_router(alerts.router)
app.include_router(messages.router)
app.include_router(appointments.router)
app.include_router(wellbeing.router)
app.include_router(users.router)
app.include_router(costs.router)
app.include_router(templates.router)
app.include_router(local_templates.router)
app.include_router(tasks.router)
app.include_router(config.router)
app.include_router(dispatch.router)
app.include_router(prestadores.router)
app.include_router(autorizaciones.router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"app": settings.app_name, "version": settings.app_version}
