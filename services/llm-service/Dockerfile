# ── LLM Service Dockerfile ────────────────────────────────────────────────────
# Uses NVIDIA CUDA base for GPU-accelerated training.
# For CPU-only, swap base to python:3.11-slim and remove CUDA deps.

FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04 AS base

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3.11-dev python3-pip curl git \
    && rm -rf /var/lib/apt/lists/*

RUN ln -s /usr/bin/python3.11 /usr/local/bin/python3
WORKDIR /app

# ── Python deps ───────────────────────────────────────────────────────────────
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# HuggingFace model cache (mount as volume in docker-compose)
ENV TRANSFORMERS_CACHE=/model-cache
ENV HF_HOME=/model-cache

# Checkpoints volume
VOLUME ["/checkpoints", "/model-cache"]

# ── App source ────────────────────────────────────────────────────────────────
COPY . .

RUN useradd -m llmuser && chown -R llmuser /app
USER llmuser

EXPOSE 9000

HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:9000/healthz || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9000", "--workers", "1"]
