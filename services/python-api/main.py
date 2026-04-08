"""
TaxWise AI — Python FastAPI microservice entry point.

Architecture:
  main.py  →  app/api/factory.py (router factory)
           →  app/core/config.py (settings)
           →  app/core/database.py (SQLAlchemy)
           →  app/models/ (ORM)
           →  app/services/ (business logic + caching)
           →  app/schemas/ (Pydantic validation)

Run locally:
  uvicorn main:app --reload --port 8000
"""
import logging
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.factory import build_api_router
from app.core.config import get_settings

settings = get_settings()

# ── Structured logging (JSON in prod, human-readable in dev) ───────────────────
logging.basicConfig(level=logging.DEBUG if settings.debug else logging.INFO)
structlog.configure(
    wrapper_class=structlog.make_filtering_bound_logger(
        logging.DEBUG if settings.debug else logging.INFO
    ),
)

logger = structlog.get_logger(__name__)


# ── Lifespan context manager (replaces deprecated on_event) ───────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up", env=settings.app_env, debug=settings.debug)
    yield
    logger.info("Shutting down")


# ── FastAPI application ────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount versioned API routers via factory ────────────────────────────────────
app.include_router(build_api_router())


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/healthz")
def health():
    """Kubernetes / Docker health probe endpoint."""
    return {"status": "ok", "service": settings.app_name, "version": settings.app_version}
