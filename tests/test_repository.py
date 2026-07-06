"""Repository-level tests: persistence + stats aggregation."""

from app import repository
from app.database import SessionLocal
from app.models import JobStatus


def test_job_lifecycle_transitions():
    with SessionLocal() as s:
        job = repository.create_job(s, task_name="tasks.cpu_bound", payload={"n": 10})
        job.celery_task_id = "task-abc"
        s.commit()
        job_id = job.id

    with SessionLocal() as s:
        repository.mark_started(s, "task-abc", worker="worker-1")
        s.commit()
    with SessionLocal() as s:
        assert repository.get_job(s, job_id).status == JobStatus.STARTED

    with SessionLocal() as s:
        repository.mark_success(s, "task-abc", {"primes_below_n": 4})
        s.commit()
    with SessionLocal() as s:
        job = repository.get_job(s, job_id)
        assert job.status == JobStatus.SUCCESS
        assert job.result == {"primes_below_n": 4}
        assert job.finished_at is not None


def test_retry_increments_counter():
    with SessionLocal() as s:
        job = repository.create_job(s, task_name="tasks.flaky", payload={})
        job.celery_task_id = "task-retry"
        s.commit()
        job_id = job.id

    with SessionLocal() as s:
        repository.mark_retry(s, "task-retry", "boom")
        repository.mark_retry(s, "task-retry", "boom again")
        s.commit()
    with SessionLocal() as s:
        job = repository.get_job(s, job_id)
        assert job.retries == 2
        assert job.status == JobStatus.RETRY


def test_compute_stats_counts_and_rates():
    with SessionLocal() as s:
        for i in range(3):
            j = repository.create_job(s, task_name="tasks.cpu_bound", payload={})
            j.celery_task_id = f"ok-{i}"
        j = repository.create_job(s, task_name="tasks.flaky", payload={})
        j.celery_task_id = "bad-0"
        s.commit()
        for i in range(3):
            repository.mark_success(s, f"ok-{i}", {"v": i})
        repository.mark_failure(s, "bad-0", "nope")
        s.commit()

        stats = repository.compute_stats(s)
        assert stats["total"] == 4
        assert stats["by_status"]["SUCCESS"] == 3
        assert stats["by_status"]["FAILURE"] == 1
        assert stats["success_rate"] == 0.75
        assert stats["completion_rate"] == 1.0
