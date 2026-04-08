"""
Pytest configuration and shared fixtures.
Sets up APP_ENV=development so Settings reads .env.development.
"""
import os
import sys
from pathlib import Path

# Add services/python-api/ to sys.path so 'app' and 'main' are importable
sys.path.insert(0, str(Path(__file__).parent.parent))

# Force development env before any app imports
os.environ.setdefault("APP_ENV", "development")
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg2://taxwise:taxwise_secret@localhost:5432/taxwise")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
