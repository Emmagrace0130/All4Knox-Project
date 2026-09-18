# All4Knox FastAPI backend
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencies first so code edits don't invalidate the pip layer.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY tests ./tests

# Vector index lives on a named volume so it survives restarts and is not
# rebuilt (and re-embedded) on every deploy.
RUN mkdir -p /data/vector_store

EXPOSE 8000

# Deterministic clinical endpoints are pure reads with no shared state, so
# multiple workers are safe. Kept at 2 to be a considerate neighbour on a
# shared GPU box — see docs/rules-of-engagement.md.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
