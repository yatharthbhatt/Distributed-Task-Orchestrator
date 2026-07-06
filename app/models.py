"""ORM models."""

from __future__ import annotations

import enum
from datetime import UTC, datetime

from sqlalchemy import DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class JobStatus(str, enum.Enum):
    """Lifecycle states for a job, mirrored from Celery task states."""

    PENDING = "PENDING"   # queued, not yet picked up
    STARTED = "STARTED"   # a worker is executing it
    RETRY = "RETRY"       # failed an attempt, waiting to retry
    SUCCESS = "SUCCESS"   # completed successfully
    FAILURE = "FAILURE"   # exhausted retries / hard failure

    @classmethod
    def terminal(cls) -> set[JobStatus]:
        return {cls.SUCCESS, cls.FAILURE}


class Job(Base):
    """A unit of work submitted to the orchestrator.

    Rows are created by the API on submission and mutated by Celery signal
    handlers as the task moves through its lifecycle.
    """

    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    celery_task_id: Mapped[str | None] = mapped_column(String(155), index=True, nullable=True)
    task_name: Mapped[str] = mapped_column(String(255), index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)

    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, native_enum=False, length=20),
        default=JobStatus.PENDING,
        index=True,
    )
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    retries: Mapped[int] = mapped_column(Integer, default=0)
    worker: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def duration_seconds(self) -> float | None:
        if self.started_at and self.finished_at:
            return (self.finished_at - self.started_at).total_seconds()
        return None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "celery_task_id": self.celery_task_id,
            "task_name": self.task_name,
            "payload": self.payload,
            "status": self.status.value if isinstance(self.status, JobStatus) else self.status,
            "result": self.result,
            "error": self.error,
            "retries": self.retries,
            "worker": self.worker,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "duration_seconds": self.duration_seconds,
        }
