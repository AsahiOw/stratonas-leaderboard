#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="$(cd "$(dirname "$0")/.." && pwd)/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y-%m-%d_%H-%M)
FILENAME="stratonas_${TIMESTAMP}.sql"

CONTAINER=$(docker compose ps -q db 2>/dev/null | head -1)
if [ -z "$CONTAINER" ]; then
  echo "Error: db container not running. Start with: docker compose up -d db"
  exit 1
fi

source "$(dirname "$0")/../.env" 2>/dev/null || true

docker exec "$CONTAINER" pg_dump \
  -U "${POSTGRES_USER:-stratonas}" \
  -d "${POSTGRES_DB:-stratonas}" \
  --no-password \
  > "$BACKUP_DIR/$FILENAME"

echo "Backup saved to: $BACKUP_DIR/$FILENAME"
