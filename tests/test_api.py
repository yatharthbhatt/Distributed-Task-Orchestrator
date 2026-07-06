"""API-level tests: submit -> status -> stats round trip via the FastAPI client."""


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["eager"] is True


def test_submit_job_executes_eagerly_and_persists(client):
    r = client.post("/jobs", json={"task_type": "cpu", "payload": {"n": 100}})
    assert r.status_code == 201
    job = r.json()
    # In eager mode the job has already run by the time the response returns.
    assert job["status"] == "SUCCESS"
    assert job["result"]["primes_below_n"] == 25
    assert job["celery_task_id"]

    # It is retrievable and reflected in stats.
    got = client.get(f"/jobs/{job['id']}").json()
    assert got["status"] == "SUCCESS"

    stats = client.get("/stats").json()
    assert stats["total"] == 1
    assert stats["by_status"]["SUCCESS"] == 1
    assert stats["success_rate"] == 1.0


def test_unknown_task_type_is_rejected(client):
    r = client.post("/jobs", json={"task_type": "does-not-exist", "payload": {}})
    assert r.status_code == 422


def test_list_jobs_filter_and_paginate(client):
    for n in (10, 20, 30):
        client.post("/jobs", json={"task_type": "cpu", "payload": {"n": n}})

    all_jobs = client.get("/jobs").json()
    assert all_jobs["total"] == 3
    assert len(all_jobs["items"]) == 3

    success_only = client.get("/jobs", params={"status": "SUCCESS"}).json()
    assert success_only["total"] == 3

    page = client.get("/jobs", params={"limit": 2, "offset": 0}).json()
    assert len(page["items"]) == 2


def test_flaky_job_that_fails_is_recorded_as_failure(client):
    r = client.post("/jobs", json={"task_type": "flaky", "payload": {"failure_rate": 1.0}})
    assert r.status_code == 201
    job = r.json()
    assert job["status"] == "FAILURE"
    # retry signal fired during eager retries, so the counter advanced.
    assert job["retries"] >= 1


def test_workers_endpoint_reports_offline_in_eager_mode(client):
    r = client.get("/workers")
    assert r.status_code == 200
    body = r.json()
    assert body["online"] is False
    assert body["count"] == 0
