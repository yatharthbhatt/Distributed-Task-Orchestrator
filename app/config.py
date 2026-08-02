"""Central configuration for the orchestrator.

A single ``Settings`` object drives *both* run modes:

* ``local``  — SQLite + Celery eager execution. No Redis/Postgres/Docker required.
               Ideal for tests and a quick demo on any machine.
* ``docker`` — Redis broker/backend + PostgreSQL, real distributed workers.

Everything is overridable via environment variables (or a ``.env`` file), so the
same code powers a laptop demo and a scaled-out Docker Compose deployment.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ------------------------------------------------------------------ run mode
    run_mode: str = Field(
        default="local",
        description="'local' (SQLite + eager Celery) or 'docker' (Redis + Postgres).",
    )

    # ------------------------------------------------------------------ broker/backend
    # Left as None so the validator can pick sensible per-mode defaults.
    broker_url: str | None = None
    result_backend: str | None = None
    database_url: str | None = None

    # When true, tasks execute in the calling process (no worker/broker needed).
    task_always_eager: bool | None = None

    # ------------------------------------------------------------------ retry / fault tolerance
    max_retries: int = Field(default=5, description="Max automatic retries per task.")
    retry_backoff_base: int = Field(default=2, description="Base seconds for exponential backoff.")
    retry_backoff_max: int = Field(default=60, description="Cap on backoff delay in seconds.")
    retry_jitter: bool = Field(default=True, description="Add randomness to backoff delays.")

    # ------------------------------------------------------------------ worker tuning
    worker_concurrency: int = Field(default=4)
    worker_prefetch_multiplier: int = Field(default=1)

    # ------------------------------------------------------------------ demo / flaky task
    flaky_failure_rate: float = Field(
        default=0.4,
        description="Probability a 'flaky' task fails on a given attempt (demo of retries).",
    )

    # ------------------------------------------------------------------ api
    # Both loopback spellings: the dashboard is reachable as either, and the
    # browser's choice determines the Origin header the API has to accept.
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"]
    )
    api_title: str = "Distributed Task Orchestrator API"

    # ------------------------------------------------------------------ derived defaults
    @model_validator(mode="after")
    def _apply_mode_defaults(self) -> Settings:
        is_local = self.run_mode.lower() == "local"

        if self.task_always_eager is None:
            self.task_always_eager = is_local

        if self.broker_url is None:
            self.broker_url = "memory://" if is_local else "redis://redis:6379/0"

        if self.result_backend is None:
            # 'cache+memory://' keeps eager results in-process; Redis in docker mode.
            self.result_backend = "cache+memory://" if is_local else "redis://redis:6379/1"

        if self.database_url is None:
            self.database_url = (
                "sqlite:///./orchestrator.db"
                if is_local
                else "postgresql+psycopg://orchestrator:orchestrator@postgres:5432/orchestrator"
            )
        return self


@lru_cache
def get_settings() -> Settings:
    """Return a cached ``Settings`` instance (read once per process)."""
    return Settings()


settings = get_settings()
