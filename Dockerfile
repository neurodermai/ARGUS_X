FROM python:3.11-slim

WORKDIR /app

# Install system deps for ML packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy entire project
COPY . .

# Set working directory to backend
WORKDIR /app/argus/backend

# Railway sets PORT env var dynamically
ENV PORT=8000

# Start uvicorn — use shell form so $PORT gets expanded
CMD python -m uvicorn main:app --host 0.0.0.0 --port $PORT
