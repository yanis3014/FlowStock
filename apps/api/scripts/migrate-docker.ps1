# Migration script for Windows that runs migrations inside Docker container
# This solves authentication issues when connecting from Windows host

$ErrorActionPreference = "Stop"

$CONTAINER_NAME = if ($env:POSTGRES_CONTAINER) { $env:POSTGRES_CONTAINER } else { "bmad-stock-agent-postgres-1" }
$MIGRATIONS_DIR = Join-Path $PSScriptRoot "..\migrations"

Write-Host "🐳 Running migrations via Docker container: $CONTAINER_NAME" -ForegroundColor Cyan
Write-Host "📁 Migrations directory: $MIGRATIONS_DIR" -ForegroundColor Cyan

# Check if container is running
$containerRunning = docker ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}"
if (-not $containerRunning) {
    Write-Host "❌ Container $CONTAINER_NAME is not running!" -ForegroundColor Red
    Write-Host "Please start it with: docker-compose up -d postgres" -ForegroundColor Yellow
    exit 1
}

# Copy migrations to container
Write-Host "📦 Copying migrations to container..." -ForegroundColor Cyan
docker cp "$MIGRATIONS_DIR" "${CONTAINER_NAME}:/tmp/migrations"

# Get list of migration files and run them one by one
Write-Host "📄 Running migrations..." -ForegroundColor Cyan
$migrationFiles = Get-ChildItem -Path $MIGRATIONS_DIR -Filter "V*.sql" | Sort-Object Name

foreach ($file in $migrationFiles) {
    Write-Host "📄 Running migration: $($file.Name)" -ForegroundColor Yellow
    $sqlContent = Get-Content -Path $file.FullName -Raw
    $sqlContent | docker exec -i $CONTAINER_NAME psql -U bmad -d bmad_stock_agent
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Migration $($file.Name) failed!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Migrations completed successfully!" -ForegroundColor Green
