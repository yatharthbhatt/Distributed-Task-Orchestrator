"""Aggregate statistics endpoints, including a Server-Sent Events live stream."""

from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from app import repository
from app.database import get_db, session_scope
from app.schemas import StatsResponse

router = APIRouter(tags=["stats"])


@router.get("/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)) -> StatsResponse:
    return StatsResponse(**repository.compute_stats(db))


@router.get("/stats/stream")
async def stream_stats(interval: float = 2.0):
    """Push aggregate stats to the dashboard over SSE.

    Each event carries the same payload as ``GET /stats`` so the client can drive
    live charts without polling. A fresh DB session is opened per tick.
    """
    interval = max(0.5, min(float(interval), 30.0))

    async def event_generator():
        while True:
            with session_scope() as session:
                stats = repository.compute_stats(session)
            yield {"event": "stats", "data": json.dumps(stats)}
            await asyncio.sleep(interval)

    return EventSourceResponse(event_generator())
