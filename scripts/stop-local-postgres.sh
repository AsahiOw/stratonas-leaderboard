#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$project_root/Development_data/native-postgres"

if ! command -v pg_ctl &>/dev/null; then
  echo "Could not find pg_ctl. Install PostgreSQL and make sure its bin folder is on PATH."
  exit 1
fi

if [[ ! -f "$DATA_DIR/PG_VERSION" ]]; then
  echo "No local PostgreSQL data folder exists yet."
  exit 0
fi

pg_ctl -D "$DATA_DIR" stop -m fast
echo "PostgreSQL stopped."
