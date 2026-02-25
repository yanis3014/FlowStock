#!/usr/bin/env bash
# Backup PostgreSQL database (Story 1.2)
# Usage: ./scripts/backup-database.sh [output_dir]
# Requires: DATABASE_URL or POSTGRES_* env vars (see .env.example)
# For daily backups: add to cron, e.g. 0 2 * * * /path/to/backup-database.sh /backups

set -e
OUTPUT_DIR="${1:-./backups}"
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILE="$OUTPUT_DIR/bmad_stock_agent_$TIMESTAMP.sql"

if [ -n "$DATABASE_URL" ]; then
  pg_dump "$DATABASE_URL" --no-owner --no-acl -F p -f "$FILE"
else
  export PGHOST="${POSTGRES_HOST:-localhost}"
  export PGPORT="${POSTGRES_PORT:-5432}"
  export PGUSER="${POSTGRES_USER:-bmad}"
  export PGPASSWORD="${POSTGRES_PASSWORD}"
  export PGDATABASE="${POSTGRES_DB:-bmad_stock_agent}"
  if [ -z "$PGPASSWORD" ]; then
    echo "Error: PGPASSWORD or DATABASE_URL must be set for backup." >&2
    exit 1
  fi
  pg_dump -F p -f "$FILE"
fi

echo "Backup written to $FILE"
gzip -f "$FILE"
echo "Compressed to ${FILE}.gz"
