"use client";

import { STATUS_COLORS, type Job, type JobStatus } from "@/lib/api";

function StatusPill({ status }: { status: JobStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
      }}
    >
      <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: color }} />
      {status}
    </span>
  );
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function fmtDuration(s: number | null): string {
  if (s == null) return "—";
  if (s < 1) return `${Math.round(s * 1000)} ms`;
  return `${s.toFixed(2)} s`;
}

export function JobTable({ jobs }: { jobs: Job[] }) {
  return (
    <div className="card p-4 h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Recent jobs</h2>
          <p className="text-xs text-ink-muted">Live — newest first</p>
        </div>
        <span className="text-xs text-ink-muted tabular">{jobs.length} shown</span>
      </div>

      <div className="overflow-auto -mx-1 px-1" style={{ maxHeight: 360 }}>
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0" style={{ background: "var(--surface)" }}>
            <tr className="text-left text-xs text-ink-muted">
              <th className="py-2 pr-3 font-medium">ID</th>
              <th className="py-2 pr-3 font-medium">Task</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium tabular">Retries</th>
              <th className="py-2 pr-3 font-medium tabular">Duration</th>
              <th className="py-2 pr-3 font-medium">Worker</th>
              <th className="py-2 pr-0 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-ink-muted text-sm">
                  No jobs yet — submit one to get started.
                </td>
              </tr>
            )}
            {jobs.map((job) => (
              <tr key={job.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="py-2 pr-3 tabular text-ink-secondary">#{job.id}</td>
                <td className="py-2 pr-3 text-ink">{job.task_name.replace("tasks.", "")}</td>
                <td className="py-2 pr-3"><StatusPill status={job.status} /></td>
                <td className="py-2 pr-3 tabular text-ink-secondary">{job.retries}</td>
                <td className="py-2 pr-3 tabular text-ink-secondary">{fmtDuration(job.duration_seconds)}</td>
                <td className="py-2 pr-3 text-ink-secondary truncate max-w-[120px]">{job.worker ?? "—"}</td>
                <td className="py-2 pr-0 tabular text-ink-muted">{fmtTime(job.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
