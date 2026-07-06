"""Simulated heavy tasks.

These stand in for real workloads (media processing, ETL, model inference…). Each
task is decorated with the orchestrator's fault-tolerance policy: automatic retries
for :class:`TransientError` with exponential backoff + jitter, capped delay, and a
bounded retry count. The ``flaky`` task exists specifically to *exercise* that policy
so the dashboard visibly shows RETRY → SUCCESS transitions.
"""

from __future__ import annotations

import hashlib
import math
import random
import time

from celery import shared_task

from app.config import settings


class TransientError(Exception):
    """A recoverable error that should trigger a retry (vs. a permanent failure)."""


# Shared retry policy applied to every task. Read from settings at import time.
RETRY_POLICY = dict(
    autoretry_for=(TransientError,),
    retry_backoff=settings.retry_backoff_base,   # exponential base (seconds)
    retry_backoff_max=settings.retry_backoff_max,  # cap on delay
    retry_jitter=settings.retry_jitter,            # spread retries to avoid thundering herd
    max_retries=settings.max_retries,
    acks_late=True,
)


@shared_task(name="tasks.cpu_bound", bind=True, **RETRY_POLICY)
def cpu_bound(self, n: int = 50_000) -> dict:
    """CPU-heavy: count primes below ``n`` via trial division."""
    n = max(2, min(int(n), 2_000_000))  # clamp to keep demos snappy
    count = 0
    for candidate in range(2, n):
        limit = int(math.isqrt(candidate))
        is_prime = True
        for divisor in range(2, limit + 1):
            if candidate % divisor == 0:
                is_prime = False
                break
        if is_prime:
            count += 1
    return {"n": n, "primes_below_n": count, "worker": self.request.hostname}


@shared_task(name="tasks.io_bound", bind=True, **RETRY_POLICY)
def io_bound(self, seconds: float = 1.0) -> dict:
    """IO-heavy: simulate a network/disk wait."""
    seconds = max(0.0, min(float(seconds), 30.0))
    time.sleep(seconds)
    return {"slept_seconds": seconds, "worker": self.request.hostname}


@shared_task(name="tasks.aggregate", bind=True, **RETRY_POLICY)
def aggregate(self, count: int = 10_000, seed: int | None = None) -> dict:
    """Data aggregation: hash a stream of records and compute summary stats."""
    count = max(1, min(int(count), 5_000_000))
    rng = random.Random(seed)
    total = 0.0
    digest = hashlib.sha256()
    biggest = float("-inf")
    for i in range(count):
        value = rng.random() * 1000
        total += value
        biggest = max(biggest, value)
        digest.update(f"{i}:{value}".encode())
    return {
        "count": count,
        "sum": round(total, 4),
        "mean": round(total / count, 6),
        "max": round(biggest, 4),
        "checksum": digest.hexdigest()[:16],
        "worker": self.request.hostname,
    }


@shared_task(name="tasks.flaky", bind=True, **RETRY_POLICY)
def flaky(self, failure_rate: float | None = None) -> dict:
    """Intentionally unreliable task used to demonstrate retries + backoff.

    Fails with probability ``failure_rate`` on each attempt by raising a
    :class:`TransientError`, which the retry policy catches and reschedules with
    exponentially increasing (jittered) delay until it succeeds or exhausts
    ``max_retries``.
    """
    rate = settings.flaky_failure_rate if failure_rate is None else float(failure_rate)
    attempt = self.request.retries + 1
    if random.random() < rate:
        raise TransientError(
            f"Simulated transient failure on attempt {attempt} (rate={rate})."
        )
    return {
        "succeeded_on_attempt": attempt,
        "failure_rate": rate,
        "worker": self.request.hostname,
    }
