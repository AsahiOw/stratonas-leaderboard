#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-5432}"

project_root="$(cd "$(dirname "$0")/.." && pwd)"

# Read a value from a .env file (Bash 3.2 compatible)
env_get() {
  local key="$1"
  local file="$2"
  local val
  val=$(grep "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2-)
  printf '%s' "$val"
}

PGUSER=$(env_get "POSTGRES_USER" "$project_root/.env")
PGPASSWORD=$(env_get "POSTGRES_PASSWORD" "$project_root/.env")
PGDATABASE=$(env_get "POSTGRES_DB" "$project_root/.env")

DATA_DIR="$project_root/Development_data/native-postgres"
LOG_DIR="$project_root/Development_data/logs"
LOG_FILE="$LOG_DIR/postgres.log"

mkdir -p "$(dirname "$DATA_DIR")" "$LOG_DIR"

# Check for PostgreSQL tools
for tool in initdb pg_ctl psql createdb; do
  if ! command -v "$tool" &>/dev/null; then
    echo "Could not find $tool. Install PostgreSQL and make sure its bin folder is on PATH."
    exit 1
  fi
done

# Initialize database cluster if needed
if [[ ! -f "$DATA_DIR/PG_VERSION" ]]; then
  echo "Initializing new PostgreSQL cluster..."
  echo "$PGPASSWORD" > /tmp/pg-password-$$.txt
  initdb -D "$DATA_DIR" -U "$PGUSER" --pwfile=/tmp/pg-password-$$.txt --encoding=UTF8 --locale=C
  rm -f /tmp/pg-password-$$.txt
fi

# Start PostgreSQL if not already running
export LC_ALL=C
if ! pg_ctl -D "$DATA_DIR" status >/dev/null 2>&1; then
  pg_ctl -D "$DATA_DIR" -l "$LOG_FILE" -o "-p $PORT" start
fi

# Create database if needed
export PGPASSWORD="$PGPASSWORD"
exists=$(psql -h localhost -p "$PORT" -U "$PGUSER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$PGDATABASE'" 2>/dev/null || true)
if [[ "$exists" != "1" ]]; then
  createdb -h localhost -p "$PORT" -U "$PGUSER" "$PGDATABASE"
fi

echo "PostgreSQL is running on localhost:$PORT"
echo "Data folder: $DATA_DIR"
