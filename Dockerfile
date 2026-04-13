# ══════════════════════════════════════════════════════════════════════
# ARGUS-X — Multi-Stage Production Dockerfile
# Stage 1: Install all deps (including gcc/g++ for native extensions)
# Stage 2: Copy only runtime artifacts (no build tools in final image)
# ══════════════════════════════════════════════════════════════════════

# ── Builder Stage ─────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build-time system deps (gcc/g++ for native extensions)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ && rm -rf /var/lib/apt/lists/*

# Install Python dependencies into /usr/local
COPY requirements-deploy.txt .
RUN pip install --no-cache-dir -r requirements-deploy.txt

# ── Runtime Stage ─────────────────────────────────────────────────────
FROM python:3.11-slim AS runner

WORKDIR /app

# Copy installed Python packages from builder (no gcc/g++ in this layer)
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy project files
COPY . .

# Set working directory to backend
WORKDIR /app/argus/backend

# Railway sets PORT dynamically
ENV PORT=8000

# Start
CMD python -m uvicorn main:app --host 0.0.0.0 --port $PORT
