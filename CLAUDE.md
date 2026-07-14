# SiempreCercaAPP

## Stack
- **Backend:** FastAPI + SQLAlchemy async + PostgreSQL 16 + Alembic + uv
- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Infra:** Docker Compose (db, redis, backend, worker, beat, frontend, nginx)

## Puertos locales
| Servicio       | Puerto |
|----------------|--------|
| PostgreSQL     | 5435   |
| Redis          | 6382   |
| Backend (API)  | 8300   |
| Frontend       | 5176   |
| Nginx (proxy)  | 80     |

## Setup inicial (primera vez)

```bash
bash scripts/setup.sh
```

El script hace todo automaticamente:
1. Verifica que Docker este instalado
2. Crea `.env` y `backend/.env` si no existen (desde `.env.example`)
3. Crea directorios necesarios (`media/`, `nginx/certbot/`)
4. Levanta todos los servicios con `docker compose up -d --build`
5. Espera a que la DB este healthy
6. Ejecuta migraciones (`alembic upgrade head`)
7. Carga datos iniciales (seed con 8 clientes de prueba)

## Levantar el proyecto (ya configurado)

```bash
# Levantar todo
docker compose up -d --build

# Solo rebuild + restart de un servicio
docker compose up -d --build backend

# Apagar todo
docker compose down

# Apagar y borrar datos (DB, volumes)
docker compose down -v
```

## Migraciones y seed

```bash
# Aplicar migraciones
docker compose exec backend uv run alembic upgrade head

# Crear nueva migracion
docker compose exec backend uv run alembic revision --autogenerate -m "descripcion"

# Cargar datos de prueba
docker compose exec backend uv run python -m app.scripts.seed
```

## URLs utiles (dev)

- API docs (Swagger): http://localhost:8300/docs
- Health check: http://localhost:8300/api/health
- Frontend: http://localhost:5176
- Login admin: `admin@siemprecerca.app` / (password en `backend/.env`)

## Logs

```bash
docker compose logs -f backend    # API
docker compose logs -f worker     # Celery worker
docker compose logs -f beat       # Celery beat
docker compose logs -f db         # PostgreSQL
```

## Archivos de entorno

- `.env` — variables para Docker Compose (postgres user/pass) y dev local
- `backend/.env` — variables del backend dentro de Docker (URLs internas: `db:5432`, `redis:6379`)
- `.env.example` — plantilla de referencia (commitear, nunca tiene secrets reales)

## Convenciones
- Commits en espanol, imperativo corto
- Migraciones con Alembic (nunca editar la DB a mano)
- Variables de entorno en `.env` (copiar de `.env.example`)
- Backend y frontend corren en Docker; dev sin Docker tambien posible
