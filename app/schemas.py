"""Pydantic request/response schemas for the API layer."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models import JobStatus

# Task types the API is allowed to enqueue, mapped to their registered task names.
TASK_REGISTRY: dict[str, str] = {
    "cpu": "tasks.cpu_bound",
    "io": "tasks.io_bound",
    "flaky": "tasks.flaky",
    "aggregate": "tasks.aggregate",
}


class JobCreate(BaseModel):
    """Request body for submitting a job."""

    task_type: str = Field(
        default="cpu",
        description=f"One of: {', '.join(TASK_REGISTRY)}",
        examples=["cpu"],
    )
    payload: dict = Field(
        default_factory=dict,
        description="Arbitrary task parameters (e.g. {'n': 100000}).",
        examples=[{"n": 50000}],
    )
    priority: bool = Field(default=False, description="Route to the high-priority queue.")


class JobRead(BaseModel):
    id: int
    celery_task_id: str | None = None
    task_name: str
    payload: dict
    status: JobStatus
    result: dict | None = None
    error: str | None = None
    retries: int
    worker: str | None = None
    created_at: datetime | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    duration_seconds: float | None = None

    model_config = {"from_attributes": True}


class JobListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[JobRead]


class StatsResponse(BaseModel):
    total: int
    by_status: dict[str, int]
    success_rate: float = Field(description="SUCCESS / (SUCCESS + FAILURE), 0..1.")
    completion_rate: float = Field(description="terminal jobs / total, 0..1.")
    throughput_per_min: float = Field(description="Jobs finished in the last 60s.")
    avg_duration_seconds: float | None = None
    active_jobs: int


class WorkerInfo(BaseModel):
    name: str
    active: int
    processed: int | None = None
    queues: list[str] = Field(default_factory=list)


class WorkersResponse(BaseModel):
    online: bool
    count: int
    workers: list[WorkerInfo]
