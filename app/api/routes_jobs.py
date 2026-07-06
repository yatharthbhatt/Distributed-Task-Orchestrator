"""Job submission and query endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import repository
from app.celery_app import celery_app
from app.database import get_db
from app.models import JobStatus
from app.schemas import TASK_REGISTRY, JobCreate, JobListResponse, JobRead

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", response_model=JobRead, status_code=201)
def submit_job(body: JobCreate, db: Session = Depends(get_db)) -> JobRead:
    """Create a Job row and enqueue the corresponding Celery task.

    The Celery task id is generated up front and stored on the row *before*
    dispatch, so lifecycle signals can locate the job from their very first fire
    (critical for eager mode, where the task runs synchronously inside ``.send``).
    """
    task_name = TASK_REGISTRY.get(body.task_type)
    if task_name is None:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown task_type '{body.task_type}'. Valid: {list(TASK_REGISTRY)}",
        )

    job = repository.create_job(db, task_name=task_name, payload=body.payload)
    task_id = str(uuid.uuid4())
    job.celery_task_id = task_id
    db.commit()
    db.refresh(job)

    # Use the registered task's apply_async (not app.send_task) so that
    # task_always_eager is honored in local/demo mode.
    task = celery_app.tasks[task_name]
    apply_kwargs = {"kwargs": body.payload, "task_id": task_id}
    if body.priority:
        apply_kwargs["queue"] = "priority"  # else fall through to routed queue
    task.apply_async(**apply_kwargs)

    db.refresh(job)  # pick up any status the eager run already produced
    return JobRead.model_validate(job)


@router.get("", response_model=JobListResponse)
def list_jobs(
    status: JobStatus | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> JobListResponse:
    items, total = repository.list_jobs(db, status=status, limit=limit, offset=offset)
    return JobListResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=[JobRead.model_validate(j) for j in items],
    )


@router.get("/{job_id}", response_model=JobRead)
def get_job(job_id: int, db: Session = Depends(get_db)) -> JobRead:
    job = repository.get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return JobRead.model_validate(job)
