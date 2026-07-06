"""Job persistence helpers.

Kept deliberately free of FastAPI/Celery imports so the same functions can be
called from the API request layer *and* from Celery signal handlers running
inside worker processes.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Job, JobStatus


def create_job(session: Session, *, task_name: str, payload: dict) -> Job:
    job = Job(task_name=task_name, payload=payload or {}, status=JobStatus.PENDING)
    session.add(job)
    session.flush()  # assign primary key
    return job


def get_job(session: Session, job_id: int) -> Job | None:
    return session.get(Job, job_id)


def get_job_by_task_id(session: Session, celery_task_id: str) -> Job | None:
    return session.scalars(
        select(Job).where(Job.celery_task_id == celery_task_id)
    ).first()


def list_jobs(
    session: Session,
    *,
    status: JobStatus | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Job], int]:
    base = select(Job)
    count_q = select(func.count(Job.id))
    if status is not None:
        base = base.where(Job.status == status)
        count_q = count_q.where(Job.status == status)

    total = session.scalar(count_q) or 0
    items = list(
        session.scalars(
            base.order_by(Job.created_at.desc(), Job.id.desc()).limit(limit).offset(offset)
        )
    )
    return items, total


def set_task_id(session: Session, job_id: int, celery_task_id: str) -> None:
    job = session.get(Job, job_id)
    if job is not None:
        job.celery_task_id = celery_task_id


def mark_started(session: Session, celery_task_id: str, worker: str | None) -> None:
    job = get_job_by_task_id(session, celery_task_id)
    if job is None:
        return
    job.status = JobStatus.STARTED
    job.worker = worker
    if job.started_at is None:
        job.started_at = datetime.now(UTC)


def mark_retry(session: Session, celery_task_id: str, error: str | None) -> None:
    job = get_job_by_task_id(session, celery_task_id)
    if job is None:
        return
    job.status = JobStatus.RETRY
    job.retries += 1
    if error:
        job.error = error


def mark_success(session: Session, celery_task_id: str, result: dict | None) -> None:
    job = get_job_by_task_id(session, celery_task_id)
    if job is None:
        return
    job.status = JobStatus.SUCCESS
    job.result = result
    job.error = None
    job.finished_at = datetime.now(UTC)


def mark_failure(session: Session, celery_task_id: str, error: str | None) -> None:
    job = get_job_by_task_id(session, celery_task_id)
    if job is None:
        return
    job.status = JobStatus.FAILURE
    job.error = error
    job.finished_at = datetime.now(UTC)


def compute_stats(session: Session) -> dict:
    """Aggregate job statistics for the dashboard."""
    rows = session.execute(
        select(Job.status, func.count(Job.id)).group_by(Job.status)
    ).all()
    by_status: dict[str, int] = {}
    for status, count in rows:
        key = status.value if isinstance(status, JobStatus) else str(status)
        by_status[key] = count
    for st in JobStatus:
        by_status.setdefault(st.value, 0)

    total = sum(by_status.values())
    success = by_status.get(JobStatus.SUCCESS.value, 0)
    failure = by_status.get(JobStatus.FAILURE.value, 0)
    terminal = success + failure
    active = by_status.get(JobStatus.STARTED.value, 0) + by_status.get(JobStatus.RETRY.value, 0)

    # Throughput: jobs that finished in the last 60 seconds.
    cutoff = datetime.now(UTC) - timedelta(seconds=60)
    throughput = session.scalar(
        select(func.count(Job.id)).where(Job.finished_at.isnot(None), Job.finished_at >= cutoff)
    ) or 0

    # Average duration over completed jobs (SQLite-friendly: compute in Python).
    completed = session.scalars(
        select(Job).where(Job.started_at.isnot(None), Job.finished_at.isnot(None))
    ).all()
    durations = [j.duration_seconds for j in completed if j.duration_seconds is not None]
    avg_duration = round(sum(durations) / len(durations), 4) if durations else None

    return {
        "total": total,
        "by_status": by_status,
        "success_rate": round(success / terminal, 4) if terminal else 0.0,
        "completion_rate": round(terminal / total, 4) if total else 0.0,
        "throughput_per_min": float(throughput),
        "avg_duration_seconds": avg_duration,
        "active_jobs": active,
    }
