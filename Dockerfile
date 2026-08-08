# syntax=docker/dockerfile:1

FROM python:3.12-slim

# Prevents Python from writing .pyc files and buffers stdout/stderr less,
# so `docker logs` shows uvicorn's output immediately instead of batching it.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first, separately from app code. Docker caches each
# layer — as long as requirements.txt doesn't change, rebuilding after you
# edit a .py file skips the (slow) pip install step entirely.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Now copy the actual application.
COPY app ./app
COPY frontend ./frontend

# Where the SQLite file lives if DATABASE_URL points here (see docker-compose.yml).
# Creating it at build time means the mounted volume has somewhere to attach.
RUN mkdir -p /app/data

EXPOSE 8000

# No --reload here — that's a dev-only flag. Production containers should
# run a fixed process; --reload's file-watching has no purpose in an image
# that doesn't change after it's built, and just wastes CPU.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
