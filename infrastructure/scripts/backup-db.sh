#!/bin/bash
# Database Backup Script for Local Development
# Usage: ./backup-db.sh [backup-name]

set -e

# Configuration
POSTGRES_USER="${POSTGRES_USER:-bmad}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-bmad}"
POSTGRES_DB="${POSTGRES_DB:-bmad_stock_agent}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

# Backup directory
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="${1:-backup_${TIMESTAMP}}"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.sql"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo "📦 Starting database backup..."
echo "Database: ${POSTGRES_DB}"
echo "Host: ${POSTGRES_HOST}:${POSTGRES_PORT}"
echo "Backup file: ${BACKUP_FILE}"

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
    pg_dump -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > "${BACKUP_FILE}"
else
    # Running on host, check if postgres container is running
    if docker ps | grep -q "postgres"; then
        echo "🐳 Detected Docker PostgreSQL container, backing up from container..."
        CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep -i postgres | head -n 1)
        # For Docker exec, password is passed via environment variable inside container
        # This is safer than command line but still visible in docker inspect
        docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" "${CONTAINER_NAME}" pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > "${BACKUP_FILE}"
    else
        # Direct connection to PostgreSQL using .pgpass file
        export PGPASSFILE
        pg_dump -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > "${BACKUP_FILE}"
    fi
fi

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "✅ Backup completed successfully!"
    echo "   File: ${BACKUP_FILE}"
    echo "   Size: ${BACKUP_SIZE}"
else
    echo "❌ Backup failed!"
    exit 1
fi
