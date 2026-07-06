"""Worker/queue introspection via Celery's control API."""

from __future__ import annotations

from fastapi import APIRouter

from app.celery_app import celery_app
from app.config import settings
from app.schemas import WorkerInfo, WorkersResponse

router = APIRouter(tags=["workers"])


@router.get("/workers", response_model=WorkersResponse)
def get_workers() -> WorkersResponse:
    """Report live workers using ``celery inspect``.

    In eager/local mode there is no broker to inspect, so we report ``online=False``
    with an empty fleet rather than blocking on a broker connection.
    """
    if settings.task_always_eager:
        return WorkersResponse(online=False, count=0, workers=[])

    inspector = celery_app.control.inspect(timeout=1.0)
    active = inspector.active() or {}
    stats = inspector.stats() or {}
    active_queues = inspector.active_queues() or {}

    workers: list[WorkerInfo] = []
    for name in sorted(set(active) | set(stats) | set(active_queues)):
        queues = [q.get("name") for q in active_queues.get(name, []) if q.get("name")]
        processed = None
        node_stats = stats.get(name, {})
        if "total" in node_stats and isinstance(node_stats["total"], dict):
            processed = sum(node_stats["total"].values())
        workers.append(
            WorkerInfo(
                name=name,
                active=len(active.get(name, [])),
                processed=processed,
                queues=queues,
            )
        )

    return WorkersResponse(online=bool(workers), count=len(workers), workers=workers)
