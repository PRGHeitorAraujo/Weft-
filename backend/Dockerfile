# Build context is the repo root (see docker-compose.yml and railway.json)
# so this image can also embed db/init.sql for backend/app/init_db.py.
FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY db ./db

# Railway injects the port via $PORT; fall back to 8000 for docker-compose
# and other environments that don't set it. Shell form so $PORT expands.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
