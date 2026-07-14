#!/usr/bin/env bash
# =============================================================
# SiempreCercaAPP — Setup & Launch
# Uso: bash scripts/setup.sh
# =============================================================
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "=========================================="
echo " SiempreCercaAPP — Setup"
echo "=========================================="

# ---- 1. Verificar dependencias del host ----
echo ""
echo "[1/6] Verificando dependencias..."

for cmd in docker git; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: '$cmd' no esta instalado."
    exit 1
  fi
done

if ! docker compose version &>/dev/null; then
  echo "ERROR: 'docker compose' no disponible (necesitas Docker Compose v2+)."
  exit 1
fi

echo "  docker: $(docker --version | head -1)"
echo "  compose: $(docker compose version | head -1)"

# ---- 2. Crear .env si no existe ----
echo ""
echo "[2/6] Verificando archivos de entorno..."

if [ ! -f ".env" ]; then
  echo "  Creando .env desde .env.example..."
  cp .env.example .env
  echo "  IMPORTANTE: revisa .env y cambia los secrets antes de produccion."
else
  echo "  .env ya existe, ok."
fi

if [ ! -f "backend/.env" ]; then
  echo "  Creando backend/.env desde .env.example (con URLs para Docker)..."
  sed \
    -e 's|localhost:5435|db:5432|g' \
    -e 's|localhost:6382|redis:6379|g' \
    -e 's|CORS_ORIGINS=http://localhost:5176,http://localhost:3000|CORS_ORIGINS=["http://localhost:5176","http://localhost:3000"]|g' \
    .env.example > backend/.env
  echo "  IMPORTANTE: revisa backend/.env y cambia los secrets antes de produccion."
else
  echo "  backend/.env ya existe, ok."
fi

# ---- 3. Crear directorios necesarios ----
echo ""
echo "[3/6] Creando directorios..."
mkdir -p backend/media
mkdir -p nginx/certbot/conf nginx/certbot/www
echo "  Directorios listos."

# ---- 4. Build & Up ----
echo ""
echo "[4/6] Levantando servicios con Docker Compose..."
docker compose up -d --build

echo ""
echo "  Esperando que los servicios esten healthy..."
sleep 5

# Esperar a que la DB este lista (max 60s)
TRIES=0
MAX_TRIES=12
until docker compose exec -T db pg_isready -U siemprecerca &>/dev/null; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge "$MAX_TRIES" ]; then
    echo "ERROR: la base de datos no respondio en 60s."
    docker compose logs db --tail=20
    exit 1
  fi
  echo "  DB no lista, reintentando ($TRIES/$MAX_TRIES)..."
  sleep 5
done
echo "  DB lista."

# ---- 5. Migraciones ----
echo ""
echo "[5/6] Ejecutando migraciones (Alembic)..."
docker compose exec -T backend uv run alembic upgrade head
echo "  Migraciones aplicadas."

# ---- 6. Seed ----
echo ""
echo "[6/6] Cargando datos iniciales (seed)..."
docker compose exec -T backend uv run python -m app.scripts.seed
echo "  Seed completado."

# ---- Resumen ----
echo ""
echo "=========================================="
echo " SiempreCercaAPP — LISTO"
echo "=========================================="
echo ""
echo " Servicios:"
echo "   API (FastAPI + docs): http://localhost:8300/docs"
echo "   Health check:         http://localhost:8300/api/health"
echo "   Frontend:             http://localhost:5176"
echo "   PostgreSQL:           localhost:5435"
echo "   Redis:                localhost:6382"
echo ""
echo " Login admin:"
echo "   Email:    admin@siemprecerca.app"
echo "   Password: (el que configuraste en backend/.env)"
echo ""
echo " Comandos utiles:"
echo "   docker compose logs -f backend   # ver logs del backend"
echo "   docker compose logs -f worker    # ver logs del worker"
echo "   docker compose down              # apagar todo"
echo "   docker compose restart backend   # reiniciar backend"
echo ""
