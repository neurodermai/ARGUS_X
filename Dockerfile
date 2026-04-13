# ═══════════════════════════════════════════════════════════════════════════════
# ARGUS-X — SOLE BUILD SYSTEM (Dockerfile)
# This project uses ONLY Docker for Railway deployment (see railway.json).
# DO NOT add nixpacks.toml, Procfile, or a second railway.json.
# Those files were removed to eliminate non-deterministic build conflicts.
# ═══════════════════════════════════════════════════════════════════════════════

# ── Stage 1: Builder (install deps with build tools) ─────────────────────────
FROM python:3.11-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc && rm -rf /var/lib/apt/lists/*

COPY requirements-deploy.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements-deploy.txt

# ── Stage 2: Runner (lean runtime image) ─────────────────────────────────────
FROM python:3.11-slim AS runner

WORKDIR /app

# Copy only installed packages from builder (no gcc, no pip cache)
COPY --from=builder /install /usr/local

# Copy project
COPY . .

# Set working directory to backend
WORKDIR /app/argus/backend

# Railway sets PORT dynamically
ENV PORT=8000

# Start
CMD python -m uvicorn main:app --host 0.0.0.0 --port $PORT
