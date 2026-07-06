/**
 * Typed client for the orchestrator FastAPI backend.
 * Base URL is configurable so the dashboard works in local dev and in Docker.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export type JobStatus = "PENDING" | "STARTED" | "RETRY" | "SUCCESS" | "FAILURE";

export interface Job {
  id: number;
  celery_task_id: string | null;
  task_name: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  result: Record<string, unknown> | null;
  error: string | null;
  retries: number;
  worker: string | null;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
}

export interface JobList {
  total: number;
  limit: number;
  offset: number;
  items: Job[];
}

export interface Stats {
  total: number;
  by_status: Record<JobStatus, number>;
  success_rate: number;
  completion_rate: number;
  throughput_per_min: number;
  avg_duration_seconds: number | null;
  active_jobs: number;
}

export interface WorkerInfo {
  name: string;
  active: number;
  processed: number | null;
  queues: string[];
}

export interface Workers {
  online: boolean;
  count: number;
  workers: WorkerInfo[];
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} — ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => req<{ status: string; run_mode: string; eager: boolean }>("/health"),
  stats: () => req<Stats>("/stats"),
  jobs: (limit = 25) => req<JobList>(`/jobs?limit=${limit}`),
  workers: () => req<Workers>("/workers"),
  submit: (task_type: string, payload: Record<string, unknown>, priority = false) =>
    req<Job>("/jobs", {
      method: "POST",
      body: JSON.stringify({ task_type, payload, priority }),
    }),
};

export const STATUS_COLORS: Record<JobStatus, string> = {
  SUCCESS: "var(--status-success)",
  FAILURE: "var(--status-failure)",
  RETRY: "var(--status-retry)",
  STARTED: "var(--status-started)",
  PENDING: "var(--status-pending)",
};
