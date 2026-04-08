"""
SQLAlchemy async-friendly database engine and session factory.
Uses connection pooling tuned via Settings.
"""
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

from app.core.config import get_settings

settings = get_settings()


# ── Engine ─────────────────────────────────────────────────────────────────────
engine = create_engine(
    settings.database_url,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_timeout=settings.db_pool_timeout,
    pool_pre_ping=True,       # verify connections before use
    echo=settings.debug,      # log SQL in dev only
)

# ── Session factory ────────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


# ── Base model ─────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """All SQLAlchemy models inherit from this base."""
    pass


# ── Dependency helper ──────────────────────────────────────────────────────────
@contextmanager
def get_db() -> Generator[Session, None, None]:
    """
    Context manager providing a transactional DB session.
    Commits on success, rolls back on any exception.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_db_dependency() -> Generator[Session, None, None]:
    """FastAPI Depends()-compatible DB session generator."""
    with get_db() as db:
        yield db
