#!/bin/bash
# Migration script that runs migrations inside Docker container
# This solves authentication issues when connecting from Windows host

set -e

CONTAINER_NAME="${POSTGRES_CONTAINER:-bmad-stock-agent-postgres-1}"
MIGRATIONS_DIR="$(cd "$(dirname "$0")/../migrations" && pwd)"

echo "🐳 Running migrations via Docker container: ${CONTAINER_NAME}"
echo "📁 Migrations directory: ${MIGRATIONS_DIR}"

# Copy migrations to container
echo "📦 Copying migrations to container..."
docker cp "${MIGRATIONS_DIR}" "${CONTAINER_NAME}:/tmp/migrations"

# Run migrations using Node.js inside container (if node is available) or via psql
if docker exec "${CONTAINER_NAME}" which node > /dev/null 2>&1; then
    echo "✅ Node.js found in container, using migration runner..."
    # We'll need to install node-pg in the container or use a simpler approach
    docker exec "${CONTAINER_NAME}" bash -c "
        cd /tmp/migrations
        for file in V*.sql; do
            echo \"📄 Running migration: \$file\"
            psql -U bmad -d bmad_stock_agent -f \"\$file\"
        done
    "
else
    echo "📄 Running migrations via psql..."
    docker exec "${CONTAINER_NAME}" bash -c "
        cd /tmp/migrations
        for file in \$(ls V*.sql | sort); do
            echo \"📄 Running migration: \$file\"
            psql -U bmad -d bmad_stock_agent -f \"\$file\"
        done
    "
fi

echo "✅ Migrations completed!"
