"""Distributed Task Orchestrator — a fault-tolerant, horizontally scalable job queue.

Modules
-------
config      Central pydantic-settings configuration (dual run mode).
database    SQLAlchemy engine/session factory.
models      ORM models (Job).
schemas     Pydantic request/response schemas.
repository  Job persistence helpers, shared by the API and Celery signals.
celery_app  Celery application instance and configuration.
tasks       Celery task definitions (simulated heavy work).
signals     Celery signal handlers that persist task lifecycle to the database.
api         FastAPI application (producer layer + dashboard API).
"""

__version__ = "1.0.0"
