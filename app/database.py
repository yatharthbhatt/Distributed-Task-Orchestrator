"""SQLAlchemy engine/session setup.

The engine is chosen entirely from ``settings.database_url`` — SQLite for the
zero-infra local mode, PostgreSQL (via psycopg v3) in Docker mode. A single
``SessionLocal`` factory is shared by the API request layer and the Celery
signal handlers.
"""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def _make_engine():
    url = settings.database_url
    connect_args: dict = {}
    if url.startswith("sqlite"):
        # SQLite + multithreaded access (API workers, eager tasks in threads).
        connect_args["check_same_thread"] = False
    return create_engine(url, pool_pre_ping=True, future=True, connect_args=connect_args)


engine = _make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


def init_db() -> None:
    """Create tables if they do not exist. Safe to call repeatedly."""
    # Import models so they register on Base.metadata before create_all.
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)


@contextmanager
def session_scope() -> Iterator[Session]:
    """Transactional session context manager (commit on success, rollback on error)."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db() -> Iterator[Session]:
    """FastAPI dependency that yields a request-scoped session."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
