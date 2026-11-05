# -------------------------------------------------------------
# Backend Dockerfile for College Quiz & Role Management Portal
# -------------------------------------------------------------
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=5000

WORKDIR /app

# Install runtime system packages (curl for healthcheck, libpq5 for PostgreSQL)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl libpq5 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ ./backend/

# Expose backend port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/auth/super-admin-status || exit 1

# Start production server using Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--threads", "2", "--timeout", "60", "backend.app:create_app()"]

