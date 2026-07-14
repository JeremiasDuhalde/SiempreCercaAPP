.PHONY: up down logs migrate seed test lint format simulate build

# === Docker ===
up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend worker beat

build:
	docker compose build

# === Base de datos ===
migrate:
	docker compose exec backend uv run alembic upgrade head

migration:
	docker compose exec backend uv run alembic revision --autogenerate -m "$(msg)"

seed:
	docker compose exec backend uv run python -m app.scripts.seed

# === Tests y calidad ===
test:
	docker compose exec backend uv run pytest -v

lint:
	docker compose exec backend uv run ruff check app/
	cd frontend && npm run lint

format:
	docker compose exec backend uv run ruff format app/
	cd frontend && npx prettier --write src/

# === Simulador ===
simulate:
	python tools/device_simulator.py

# === Backup ===
backup:
	bash scripts/backup.sh

# === Dev local (sin Docker) ===
dev-back:
	cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8300 --reload

dev-front:
	cd frontend && npm run dev

dev-worker:
	cd backend && uv run celery -A app.celery_app worker --loglevel=info

dev-beat:
	cd backend && uv run celery -A app.celery_app beat --loglevel=info
