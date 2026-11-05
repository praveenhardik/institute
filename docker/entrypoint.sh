#!/bin/bash
set -e

# If PGHOST is not set or is localhost/127.0.0.1, start internal PostgreSQL service
if [ -z "$PGHOST" ] || [ "$PGHOST" = "localhost" ] || [ "$PGHOST" = "127.0.0.1" ]; then
    echo "[Entrypoint] Starting internal PostgreSQL service..."
    service postgresql start

    # Ensure postgres user password matches default
    su - postgres -c "psql -c \"ALTER USER postgres PASSWORD 'postgres';\"" || true

    # Check if college_live database exists
    if ! su - postgres -c "psql -lqt" | cut -d \| -f 1 | grep -qw college_live; then
        echo "[Entrypoint] Initializing college_live database with preloaded 188 registered users..."
        su - postgres -c "psql -c 'CREATE DATABASE college_live;'"
        if [ -f /app/docker/db-init/01-init.sql ]; then
            su - postgres -c "psql -d college_live -f /app/docker/db-init/01-init.sql" || true
        fi
    fi

    export PGHOST=127.0.0.1
    export PGPORT=5432
    export PGUSER=postgres
    export PGPASSWORD=postgres
    export PGDATABASE=college_live
fi

echo "[Entrypoint] Database configured. Starting Gunicorn server on port ${PORT:-5000}..."
exec gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 4 --threads 2 --timeout 60 "backend.app:create_app()"

