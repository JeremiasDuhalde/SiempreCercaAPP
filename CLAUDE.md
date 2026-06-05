# SiempreCercaAPP

## Stack
- **Backend:** FastAPI + SQLAlchemy async + PostgreSQL 16 + Alembic + uv
- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Infra:** Docker Compose (db, redis, backend, frontend)

## Puertos locales
- PostgreSQL: 5435
- Redis: 6382
- Backend (FastAPI): 8300
- Frontend (nginx): 5176

## Comandos frecuentes
```bash
docker compose up -d --build
docker compose exec backend uv run alembic upgrade head
docker compose exec backend uv run python -m app.scripts.seed
```

## Convenciones
- Commits en espanol, imperativo corto
- Migraciones con Alembic (nunca editar la DB a mano)
- Variables de entorno en `.env` (copiar de `.env.example`)
- Backend y frontend corren en Docker; dev sin Docker tambien posible (ver READMEs)
