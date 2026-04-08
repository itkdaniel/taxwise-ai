# ── LLM Service Dockerfile ────────────────────────────────────────────────────
# Multi-stage build: GPU CUDA runtime (production) or CPU fallback.
# For CPU-only: docker build --build-arg BASE_IMAGE=python:3.11-slim .
#
# Usage:
#   GPU (default):  docker build -t llm-service .
#   CPU fallback:   docker build --build-arg BASE_IMAGE=python:3.11-slim -t llm-service-cpu .

ARG BASE_IMAGE=nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

# ── Stage 1: dependency builder ───────────────────────────────────────────────
FROM python:3.11-slim AS deps

WORKDIR /build

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM ${BASE_IMAGE} AS runtime

WORKDIR /app

# Prevent .pyc bytecode
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production \
    PYTHONPATH=/app \
    TRANSFORMERS_CACHE=/model-cache \
    HF_HOME=/model-cache

# Install Python 3.11 on CUDA Ubuntu base (already present on slim base)
RUN if command -v apt-get > /dev/null 2>&1; then \
      apt-get update && apt-get install -y --no-install-recommends \
        python3.11 python3-pip curl \
      && ln -sf /usr/bin/python3.11 /usr/local/bin/python3 \
      && rm -rf /var/lib/apt/lists/*; \
    fi

# Copy pre-built Python packages from deps stage
COPY --from=deps /install /usr/local

# Copy application source (.dockerignore excludes __pycache__, *.pyc, model files)
COPY . .

# Persistent volumes for model weights and checkpoints
VOLUME ["/checkpoints", "/model-cache"]

# Non-root user
RUN useradd -m llmuser && chown -R llmuser:llmuser /app
USER llmuser

EXPOSE 9000

HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:9000/healthz || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9000", "--workers", "1"]
