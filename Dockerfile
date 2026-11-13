# =============================================================
# Unified Fullstack Dockerfile
# Self-contained container: React Frontend + Flask/Gunicorn API + Embedded PostgreSQL
# Contains all 188 registered users preloaded & ready out of the box
# =============================================================

# --- Stage 1: Build Frontend Assets ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci || npm install

COPY frontend/ ./
RUN npm run build

# --- Stage 2: Production Python Backend, PostgreSQL & Static Host ---
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=5000 \
    PGHOST=127.0.0.1 \
    PGPORT=5432 \
    PGUSER=postgres \
    PGPASSWORD=postgres \
    PGDATABASE=college_live

WORKDIR /app

# Install PostgreSQL, curl, libpq, and bash
RUN apt-get update && \
    apt-get install -y --no-install-recommends postgresql postgresql-contrib curl libpq5 bash && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY backend/ ./backend/

# Copy database dump with 188 registered users
COPY docker/ ./docker/

# Copy built frontend from Stage 1 into /app/frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Pre-initialize internal PostgreSQL database with 188 registered users during build
RUN service postgresql start && \
    su - postgres -c "psql -c \"ALTER USER postgres PASSWORD 'postgres';\"" && \
    su - postgres -c "psql -c 'CREATE DATABASE college_live;'" && \
    su - postgres -c "psql -d college_live -f /app/docker/db-init/01-init.sql" && \
    service postgresql stop

RUN chmod +x /app/docker/entrypoint.sh

EXPOSE 5000

HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/auth/super-admin-status || exit 1

ENTRYPOINT ["/app/docker/entrypoint.sh"]
