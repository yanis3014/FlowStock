FROM python:3.11-slim AS base
WORKDIR /usr/src/app

# Install system dependencies (gcc may be needed for some Python packages)
# Retry logic for network issues
RUN apt-get update --fix-missing || true && \
    apt-get install -y --no-install-recommends gcc || \
    (apt-get update && apt-get install -y --no-install-recommends gcc) && \
    rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY pyproject.toml ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -e .

# Copy application code
COPY . .

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
