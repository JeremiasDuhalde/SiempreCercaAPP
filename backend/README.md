# SiempreCercaAPP — Backend

FastAPI + SQLAlchemy async + PostgreSQL + Alembic.

## Desarrollo local (sin Docker)

```bash
cd backend
cp .env.example .env
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8300
```

API docs: http://localhost:8300/docs
