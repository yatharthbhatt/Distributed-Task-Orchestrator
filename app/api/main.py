"""FastAPI application factory — the producer layer and dashboard API."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api import routes_jobs, routes_stats, routes_workers

# Importing celery_app triggers task + signal registration for this process.
from app.celery_app import celery_app  # noqa: F401
from app.config import settings
from app.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.api_title,
        version=__version__,
        description="Fault-tolerant distributed task orchestrator — producer & dashboard API.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(routes_jobs.router)
    app.include_router(routes_stats.router)
    app.include_router(routes_workers.router)

    @app.get("/health", tags=["meta"])
    def health() -> dict:
        return {
            "status": "ok",
            "version": __version__,
            "run_mode": settings.run_mode,
            "eager": settings.task_always_eager,
        }

    @app.get("/", tags=["meta"])
    def root() -> dict:
        return {"service": settings.api_title, "docs": "/docs", "health": "/health"}

    return app


app = create_app()
