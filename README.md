# Distributed Task Orchestrator

A fault-tolerant, horizontally scalable distributed job queue that orchestrates heavy
tasks across a fleet of Celery workers, with a **Next.js real-time dashboard** on top.

- **Producer:** FastAPI REST API accepts jobs and enqueues them.
- **Queue:** Celery over Redis, with three routed queues (`default` / `heavy` / `priority`).
- **Workers:** Celery worker nodes, scaled horizontally with a single flag.
- **State:** every job's lifecycle is persisted to PostgreSQL via Celery signal handlers.
- **Fault tolerance:** automatic retries with exponential backoff + jitter, `acks_late`,
  and reject-on-worker-lost so tasks survive worker crashes.
- **Visualization:** a live dashboard (status breakdown, throughput, success-rate gauge,
  job table, worker fleet, job submission).
- **Load tested:** a K6 script drives 100+ requests/sec against the API.

It runs in **two modes** from the same codebase:

| Mode | Command | Infra needed | Use |
|------|---------|--------------|-----|
| **Local demo** | `uvicorn app.api.main:app` | none (SQLite + Celery eager) | instant demo, tests |
| **Distributed** | `docker compose up --scale worker=4` | Docker | the real thing |

---

## Architecture

```
                    ┌─────────────────────┐
                    │  Next.js Dashboard  │  status pie · throughput · success gauge
                    │   :3000             │  live job table · submit form · workers
                    └──────────┬──────────┘
                               │ REST (+ SSE stream)
                    ┌──────────▼──────────┐
                    │   FastAPI API :8000 │  POST /jobs · GET /jobs · /stats · /workers
                    │   (producer)        │  creates a Job row, enqueues a Celery task
                    └─────┬──────────┬────┘
             enqueue task │          │ read/write
                    ┌──────▼───┐  ┌──▼──────────┐
                    │  Redis   │  │  Postgres   │  job status, result, retries, timings
                    │ broker + │  │             │
                    │ backend  │  └──▲──────────┘
                    └────┬─────┘     │ signal handlers persist every transition
                         │ consume   │
            ┌────────────▼───────────┴─────────────┐
            │  Celery workers  (--scale worker=N)  │  heavy tasks + retry/backoff
            │  worker-1  worker-2  ...  worker-N    │  Flower :5555 monitors them
            └──────────────────────────────────────┘
```

**Status flow.** The API generates the Celery task id up front, writes a `PENDING`
`Job` row, then dispatches. As the task runs, Celery emits signals
(`prerun → success/retry/failure`) that are translated into row updates
(`STARTED → RETRY → SUCCESS/FAILURE`). The dashboard reads aggregated state from
`/stats` and `/jobs`. Because the id is pre-assigned, this works identically whether the
task runs on a remote worker or eagerly in-process.

---

## Tech stack

Python 3.12 · FastAPI · Celery 5.5 · Redis · PostgreSQL (SQLAlchemy 2.0, psycopg 3) ·
Docker Compose · Flower · Next.js 15 / React 19 / Recharts · K6.

---

## Project structure

```
distributed-task-orchestrator/
├── app/                    # Python backend (modular)
│   ├── config.py           # pydantic-settings — one object drives both run modes
│   ├── celery_app.py       # Celery instance: broker, routing, fault-tolerance config
│   ├── database.py         # SQLAlchemy engine/session (Postgres or SQLite)
│   ├── models.py           # Job ORM model + JobStatus enum
│   ├── schemas.py          # Pydantic request/response models + task registry
│   ├── repository.py       # Job CRUD + stats (shared by API and signals)
│   ├── signals.py          # Celery signals → DB persistence
│   ├── tasks/heavy_tasks.py# cpu / io / aggregate / flaky tasks w/ retry policy
│   └── api/                # FastAPI app + routers (jobs, stats, workers, health)
├── dashboard/              # Next.js visualization layer
├── tests/                  # pytest (eager + SQLite, no infra required)
├── loadtest/submit_jobs.js # K6 load test
├── docker/Dockerfile.backend
├── docker-compose.yml
├── requirements.txt / requirements-dev.txt
└── Makefile
```

---

## Quick start A — local demo (no Docker, no Redis, no Postgres)

Runs the API with SQLite and Celery **eager** execution, so tasks run in-process.

```bash
# 1. create the virtual environment and install deps
python -m venv .venv
# Windows PowerShell:  .\.venv\Scripts\Activate.ps1
# macOS/Linux:         source .venv/bin/activate
pip install -r requirements-dev.txt

# 2. run the API (defaults to RUN_MODE=local)
uvicorn app.api.main:app --reload --port 8000
```

Then, in another terminal:

```bash
# submit a CPU job
curl -X POST http://localhost:8000/jobs \
  -H "Content-Type: application/json" \
  -d '{"task_type":"cpu","payload":{"n":50000}}'

# see aggregate stats
curl http://localhost:8000/stats
```

Interactive API docs: <http://localhost:8000/docs>.

### Run the dashboard against it

```bash
cd dashboard
npm install
npm run dev            # http://localhost:3000
```

The dashboard talks to `http://localhost:8000` by default (override with
`NEXT_PUBLIC_API_URL`). Submit jobs from the UI and watch the charts update live.

> **Windows note:** the venv interpreter is `.\.venv\Scripts\python.exe`. Prefix
> one-off commands with the mode, e.g. `$env:RUN_MODE="local"; uvicorn ...` in PowerShell.

---

## Quick start B — full distributed stack (Docker)

This is the real orchestrator: Redis, Postgres, the API, **N scalable workers**, Flower,
and the dashboard — one command.

```bash
# 1 worker
docker compose up --build

# horizontally scale to 4 worker nodes
docker compose up --build --scale worker=4
```

| Service | URL |
|---------|-----|
| Dashboard | <http://localhost:3000> |
| API + Swagger docs | <http://localhost:8000/docs> |
| Flower (Celery monitor) | <http://localhost:5555> |

Submit a burst of jobs (the dashboard's **×25** button, or the load test below) and watch
them fan out across workers in Flower and the dashboard's worker panel.

```bash
docker compose down          # stop
docker compose down -v        # stop and wipe the Postgres volume
```

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/jobs` | Submit a job. Body: `{"task_type": "cpu\|io\|aggregate\|flaky", "payload": {...}, "priority": false}` |
| `GET`  | `/jobs` | List jobs. Query: `status`, `limit`, `offset` |
| `GET`  | `/jobs/{id}` | Fetch a single job |
| `GET`  | `/stats` | Counts by status, success rate, throughput, avg duration |
| `GET`  | `/stats/stream` | Server-Sent Events stream of the same stats |
| `GET`  | `/workers` | Live worker fleet (via `celery inspect`) |
| `GET`  | `/health` | Health + current run mode |

**Task types:** `cpu` (`{n}` — count primes), `io` (`{seconds}` — simulated wait),
`aggregate` (`{count}` — hash + summarize a stream), `flaky` (`{failure_rate}` — fails
randomly to demonstrate retries).

---

## Fault tolerance

Every task is decorated with a shared retry policy (`app/tasks/heavy_tasks.py`):

- `autoretry_for=(TransientError,)` — recoverable errors trigger a retry.
- `retry_backoff` (exponential) + `retry_backoff_max` (cap) + `retry_jitter` — delays grow
  `~base^attempt` seconds with randomness, avoiding a thundering herd.
- `max_retries` — bounded attempts before a hard `FAILURE`.
- `task_acks_late` + `task_reject_on_worker_lost` (`app/celery_app.py`) — a task whose
  worker dies mid-execution is redelivered to another node instead of being lost.

The **`flaky`** task exists to exercise this: submit a few and watch `RETRY → SUCCESS`
transitions (and occasional `FAILURE`) appear live in the dashboard and the retry counter.

Retry/backoff knobs are configurable via env (`MAX_RETRIES`, `RETRY_BACKOFF_BASE`, …).

---

## Load testing (100+ req/sec)

With the stack running (Docker mode recommended so real workers consume the queue):

```bash
# install k6 from https://k6.io, then:
k6 run loadtest/submit_jobs.js
# or against a custom host:
k6 run -e BASE_URL=http://localhost:8000 loadtest/submit_jobs.js
```

The script ramps a **ramping arrival rate** past **120 requests/sec** and asserts
thresholds: `<2%` submission errors (mirroring the 98% completion goal) and `p95 < 800ms`.

---

## Testing

The suite runs entirely in eager + SQLite mode — **no Redis, Postgres, or Docker needed**:

```bash
pytest            # 15 tests: tasks, retries, persistence, stats, API round-trip
ruff check app tests
```

---

## Configuration

All settings have per-mode defaults (see `.env.example`); an empty `.env` is valid.

| Variable | Default (local / docker) | Purpose |
|----------|--------------------------|---------|
| `RUN_MODE` | `local` | `local` (SQLite + eager) or `docker` (Redis + Postgres) |
| `BROKER_URL` | `memory://` / `redis://redis:6379/0` | Celery broker |
| `RESULT_BACKEND` | `cache+memory://` / `redis://redis:6379/1` | Celery results |
| `DATABASE_URL` | `sqlite:///./orchestrator.db` / `postgresql+psycopg://…` | job store |
| `TASK_ALWAYS_EAGER` | `true` / `false` | run tasks in-process |
| `MAX_RETRIES` | `5` | retry cap |
| `RETRY_BACKOFF_BASE` / `_MAX` | `2` / `60` | exponential backoff seconds |
| `WORKER_CONCURRENCY` | `4` | processes per worker node |
| `FLAKY_FAILURE_RATE` | `0.4` | flaky-task failure probability |

---

## Troubleshooting

- **Dashboard shows "API unreachable"** — the API isn't running or CORS/`NEXT_PUBLIC_API_URL`
  points elsewhere. In Docker the browser must reach the API at `http://localhost:8000`
  (the build arg default), not the internal `api` hostname.
- **Worker panel says "no distributed workers"** — expected in local/eager mode; there is no
  broker to inspect. Use the Docker stack to see real workers.
- **`docker compose up` first run is slow** — it builds images and pulls Redis/Postgres; retry
  waits are handled by healthchecks.


<img width="1919" height="1079" alt="Screenshot 2026-08-02 174211" src="https://github.com/user-attachments/assets/403af15a-4d70-4c20-8d91-acdefed80979" />
<img width="1438" height="684" alt="Screenshot 2026-08-02 174254" src="https://github.com/user-attachments/assets/c5337481-d656-4e99-abd6-6214f8be0846" />


## Notes

- The backend was verified importable and green on **Python 3.14** (local venv); Docker images
  pin **python:3.12-slim** for a stable production runtime.
- `psycopg[binary]` is only exercised in Docker mode — local mode uses the stdlib SQLite driver,
  so no PostgreSQL client build tooling is required to run the demo or the tests.
