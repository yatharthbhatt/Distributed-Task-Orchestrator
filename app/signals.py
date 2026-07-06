"""Celery signal handlers → PostgreSQL.

These handlers are the bridge between the worker fleet and the dashboard: as each
task moves through its lifecycle Celery emits signals, and we translate them into
updates on the corresponding ``Job`` row. Because the API pre-assigns each task's
id (see ``routes_jobs``), the row can be found by ``celery_task_id`` from the very
first signal — this works identically in eager (local) and distributed mode.
"""

from __future__ import annotations

import logging

from celery.signals import task_failure, task_prerun, task_retry, task_success

from app import repository
from app.database import init_db, session_scope

logger = logging.getLogger("orchestrator.signals")

# Ensure tables exist inside worker processes too (they don't run the API startup).
try:
    init_db()
except Exception as exc:  # pragma: no cover - defensive; DB may be provisioning
    logger.warning("init_db() during signal import failed: %s", exc)


def _coerce_result(result) -> dict | None:
    if result is None:
        return None
    if isinstance(result, dict):
        return result
    return {"value": result}


@task_prerun.connect
def on_prerun(task_id=None, task=None, **_):
    worker = getattr(getattr(task, "request", None), "hostname", None)
    with session_scope() as session:
        repository.mark_started(session, task_id, worker)


@task_retry.connect
def on_retry(request=None, reason=None, **_):
    task_id = getattr(request, "id", None)
    if not task_id:
        return
    with session_scope() as session:
        repository.mark_retry(session, task_id, str(reason) if reason else None)


@task_success.connect
def on_success(sender=None, result=None, **_):
    task_id = getattr(getattr(sender, "request", None), "id", None)
    if not task_id:
        return
    with session_scope() as session:
        repository.mark_success(session, task_id, _coerce_result(result))


@task_failure.connect
def on_failure(task_id=None, exception=None, **_):
    with session_scope() as session:
        repository.mark_failure(session, task_id, str(exception) if exception else "unknown error")
