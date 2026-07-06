# Convenience targets. On Windows, run under Git Bash, or use the raw commands
# from the README (PowerShell). VENV_PY points at the venv interpreter.
VENV_PY ?= .venv/bin/python
ifeq ($(OS),Windows_NT)
	VENV_PY = .venv/Scripts/python.exe
endif

.PHONY: help venv install test lint run-api run-worker demo dashboard up up-scale down logs loadtest clean

help:
	@echo "Targets:"
	@echo "  venv        Create the Python virtual environment"
	@echo "  install     Install backend + dev dependencies into the venv"
	@echo "  test        Run the pytest suite (eager + SQLite, no infra)"
	@echo "  lint        Run ruff"
	@echo "  run-api     Run the API locally in demo mode (SQLite + eager)"
	@echo "  run-worker  Run a Celery worker (needs Redis; use 'up' instead for full stack)"
	@echo "  demo        Alias for run-api"
	@echo "  dashboard   Run the Next.js dev server (dashboard/)"
	@echo "  up          docker compose up --build (full distributed stack)"
	@echo "  up-scale    docker compose up --build --scale worker=4"
	@echo "  down        docker compose down"
	@echo "  logs        Tail docker compose logs"
	@echo "  loadtest    Run the k6 load test against the API"
	@echo "  clean       Remove caches and local SQLite databases"

venv:
	python -m venv .venv

install:
	$(VENV_PY) -m pip install --upgrade pip
	$(VENV_PY) -m pip install -r requirements-dev.txt

test:
	$(VENV_PY) -m pytest -q

lint:
	$(VENV_PY) -m ruff check app tests

run-api demo:
	RUN_MODE=local $(VENV_PY) -m uvicorn app.api.main:app --reload --port 8000

run-worker:
	RUN_MODE=docker $(VENV_PY) -m celery -A app.celery_app worker --loglevel=info -Q default,heavy,priority

dashboard:
	cd dashboard && npm run dev

up:
	docker compose up --build

up-scale:
	docker compose up --build --scale worker=4

down:
	docker compose down

logs:
	docker compose logs -f

loadtest:
	k6 run loadtest/submit_jobs.js

clean:
	rm -rf .pytest_cache .ruff_cache **/__pycache__ orchestrator.db .pytest_orchestrator.db
