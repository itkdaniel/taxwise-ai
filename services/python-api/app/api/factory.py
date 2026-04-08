"""
Router factory — assembles versioned API routers dynamically.
Adding a new version is a one-line change here and in main.py.
"""
from fastapi import APIRouter

from app.api.v1 import tax_returns, llm_models, scraper


def create_v1_router() -> APIRouter:
    """
    Build and return the v1 APIRouter with all sub-routers mounted.
    The factory pattern makes it trivial to test or swap individual routers.
    """
    v1 = APIRouter(prefix="/v1")
    v1.include_router(tax_returns.router)
    v1.include_router(llm_models.router)
    v1.include_router(scraper.router)
    return v1


def build_api_router() -> APIRouter:
    """
    Top-level router factory.
    Mount additional API versions here (v2, v3…) without touching main.py.
    """
    api = APIRouter(prefix="/api")
    api.include_router(create_v1_router())
    return api
