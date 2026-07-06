"""Celery application instance and configuration.

This is the heart of the orchestrator. Broker/backend URLs, task routing across
priority queues, and the fault-tolerance knobs (acks_late, reject-on-lost) are all
configured here from the central ``settings`` object.
"""

from __future__ import annotations

from celery import Celery
from kombu import Exchange, Queue

from app.config import settings

celery_app = Celery("orchestrator")

# ---------------------------------------------------------------------------
# Queue topology: three named queues let us route light vs heavy vs priority
# work independently and scale workers per queue.
# ---------------------------------------------------------------------------
default_exchange = Exchange("orchestrator", type="direct")

celery_app.conf.task_queues = (
    Queue("default", default_exchange, routing_key="default"),
    Queue("heavy", default_exchange, routing_key="heavy"),
    Queue("priority", default_exchange, routing_key="priority"),
)

celery_app.conf.update(
    # ----- broker / backend -----
    broker_url=settings.broker_url,
    result_backend=settings.result_backend,
    broker_connection_retry_on_startup=True,

    # ----- serialization -----
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,

    # ----- routing -----
    task_default_queue="default",
    task_default_exchange="orchestrator",
    task_default_routing_key="default",
    task_routes={
        "tasks.cpu_bound": {"queue": "heavy"},
        "tasks.aggregate": {"queue": "heavy"},
        "tasks.io_bound": {"queue": "default"},
        "tasks.flaky": {"queue": "default"},
    },

    # ----- fault tolerance -----
    # acks_late + reject_on_worker_lost => a task killed mid-flight (e.g. a crashed
    # worker node) is redelivered to another worker instead of being lost.
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_track_started=True,

    # ----- fair dispatch -----
    # prefetch=1 stops a single worker from hoarding the queue, which keeps latency
    # low and load even across horizontally scaled nodes.
    worker_prefetch_multiplier=settings.worker_prefetch_multiplier,
    worker_concurrency=settings.worker_concurrency,

    # ----- results -----
    result_expires=3600,

    # ----- eager mode (local/demo/tests) -----
    task_always_eager=settings.task_always_eager,
    task_eager_propagates=False,
)


def register() -> None:
    """Import task and signal modules so they attach to this app.

    Called by worker and API entrypoints. Kept as a function to avoid import
    cycles (tasks import ``celery_app``; ``celery_app`` must not import tasks at
    module load time).
    """
    from app import signals  # noqa: F401  (registers signal handlers)
    from app.tasks import heavy_tasks  # noqa: F401  (registers tasks)


# Autodiscovery covers the common case; ``register()`` guarantees eager mode and
# the API process also see the tasks/signals.
celery_app.autodiscover_tasks(["app.tasks"])
register()
