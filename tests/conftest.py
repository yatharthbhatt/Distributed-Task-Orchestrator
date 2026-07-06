"""Test configuration.

Forces local (eager + SQLite) mode *before* any app module is imported, so the
whole suite runs with no Redis/Postgres/Docker. Tables are recreated per test for
isolation.
"""

import os

os.environ["RUN_MODE"] = "local"
os.environ.setdefault("DATABASE_URL", "sqlite:///./.pytest_orchestrator.db")
os.environ.setdefault("MAX_RETRIES", "3")
os.environ.setdefault("RETRY_BACKOFF_BASE", "1")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402


@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    from app.api.main import app

    with TestClient(app) as c:
        yield c
