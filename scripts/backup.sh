#!/bin/bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_CONTAINER="${DB_CONTAINER:-siemprecerca_db}"
DB_USER="${POSTGRES_USER:-siemprecerca}"
DB_NAME="${POSTGRES_DB:-siemprecerca}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Iniciando backup..."

# PostgreSQL dump
echo "  Dumping PostgreSQL..."
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" \
  | gzip > "$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"
echo "  → $BACKUP_DIR/db_${TIMESTAMP}.sql.gz"

# Media files
if [ -d "./backend/media" ] && [ "$(ls -A ./backend/media 2>/dev/null)" ]; then
  echo "  Archivando media..."
  tar -czf "$BACKUP_DIR/media_${TIMESTAMP}.tar.gz" ./backend/media/
  echo "  → $BACKUP_DIR/media_${TIMESTAMP}.tar.gz"
fi

# Limpiar backups viejos
echo "  Limpiando backups > ${RETENTION_DAYS} dias..."
find "$BACKUP_DIR" -name "*.gz" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true

echo "[$(date)] Backup completado: $TIMESTAMP"
