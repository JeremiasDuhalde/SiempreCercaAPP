# SiempreCercaAPP

Aplicacion web SiempreCerca.

## Stack

- **Backend:** FastAPI + SQLAlchemy (async) + PostgreSQL + Alembic + `uv`
- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Infra:** Docker Compose (db, redis, backend, frontend)

## Puertos locales

| Servicio | Puerto |
|----------|--------|
| PostgreSQL | 5435 |
| Redis | 6382 |
| Backend (FastAPI) | 8300 |
| Frontend (Vite build via nginx) | 5176 |

(Puertos elegidos para no chocar con otros proyectos del workspace.)

## Arrancar en local

```bash
# 1. Preparar .env
cp .env.example .env
cp .env.example backend/.env

# 2. Build y up
docker compose up -d --build

# 3. Migraciones (primera vez y despues de cada cambio de modelo)
docker compose exec backend uv run alembic upgrade head

# 4. Seed admin
docker compose exec backend uv run python -m app.scripts.seed
```

- API docs: http://localhost:8300/docs
- Web: http://localhost:5176
- Admin: http://localhost:5176/admin/login

## Estructura

```
SiempreCercaAPP/
  backend/      # FastAPI + SQLAlchemy + Alembic
  frontend/     # React + Vite + Tailwind
  docker-compose.yml
  .env.example
```
