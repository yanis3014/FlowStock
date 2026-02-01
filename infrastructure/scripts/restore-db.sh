#!/bin/bash
# Database Restore Script for Local Development
# Usage: ./restore-db.sh <backup-file.sql>

set -e

if [ -z "$1" ]; then
    echo "❌ Error: Backup file required"
    echo "Usage: ./restore-db.sh <backup-file.sql>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

# Configuration
POSTGRES_USER="${POSTGRES_USER:-bmad}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-bmad}"
POSTGRES_DB="${POSTGRES_DB:-bmad_stock_agent}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

echo "🔄 Starting database restore..."
echo "Database: ${POSTGRES_DB}"
echo "Host: ${POSTGRES_HOST}:${POSTGRES_PORT}"
echo "Backup file: ${BACKUP_FILE}"

# Confirm before proceeding
read -p "⚠️  This will overwrite the current database. Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 1
fi

# Create temporary .pgpass file to avoid password exposure in process list
PGPASSFILE=$(mktemp)
echo "${POSTGRES_HOST}:${POSTGRES_PORT}:${POSTGRES_DB}:${POSTGRES_USER}:${POSTGRES_PASSWORD}" > "${PGPASSFILE}"
chmod 600 "${PGPASSFILE}"

# Cleanup function
cleanup() {
    rm -f "${PGPASSFILE}"
}
trap cleanup EXIT

# Check if running in Docker
if [ -f /.dockerenv ]; then
    # Running inside Docker container
    export PGPASSFILE
    psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "${BACKUP_FILE}"
else
    # Running on host, check if postgres container is running
    if docker ps | grep -q "postgres"; then
        echo "🐳 Detected Docker PostgreSQL container, restoring to container..."
        CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep -i postgres | head -n 1)
        # For Docker exec, password is passed via environment variable inside container
        docker exec -i -e PGPASSWORD="${POSTGRES_PASSWORD}" "${CONTAINER_NAME}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "${BACKUP_FILE}"
    else
        # Direct connection to PostgreSQL using .pgpass file
        export PGPASSFILE
        psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "${BACKUP_FILE}"
    fi
fi

if [ $? -eq 0 ]; then
    echo "✅ Restore completed successfully!"
else
    echo "❌ Restore failed!"
    exit 1
fi
