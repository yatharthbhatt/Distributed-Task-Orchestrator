"use client";

import { STATUS_COLORS, type Job, type JobStatus } from "@/lib/api";

/**
 * The live job stream. Rows are hairline-separated rather than boxed, so the
 * aurora stays visible through the panel and the table reads as one surface.
 * Status is a frosted chip that always spells the state out in text.
 */

function StatusChip({ status }: { status: JobStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <span
      className="pill inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 11%, white)`,
        borderColor: `color-mix(in srgb, ${color} 26%, transparent)`,
      }}
    >
      <span
        className="inline-block rounded-full shrink-0"
        style={{ width: 5, height: 5, background: color }}
      />
      {status}
    </span>
  );
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fmtDuration(s: number | null): string {
  if (s == null) return "—";
  if (s < 1) return `${Math.round(s * 1000)} ms`;
  return `${s.toFixed(2)} s`;
}

export function JobTable({ jobs }: { jobs: Job[] }) {
  return (
    <div className="glass flex flex-col min-h-0 overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-4">
        <div>
          <div className="text-[10px] uppercase tracking-overline text-ink-muted font-medium">
            Event stream
          </div>
          <h2 className="text-base font-semibold text-ink mt-1.5">Recent jobs</h2>
        </div>
        <span className="pill px-3 py-1.5 text-xs text-ink-secondary tabular shrink-0">
          {jobs.length} shown · newest first
        </span>
      </div>

      <div className="overflow-auto scroll-glass px-6 pb-6" style={{ maxHeight: 420 }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-overline text-ink-muted">
              {/* Sticky header needs its own frosted backing or rows show through. */}
              {["ID", "Task", "Status", "Retries", "Duration", "Worker", "Created"].map((h) => (
                <th
                  key={h}
                  className="sticky top-0 z-10 font-medium py-2.5 pr-4 last:pr-0"
                  style={{
                    background: "var(--frost)",
                    backdropFilter: "blur(14px)",
                    WebkitBackdropFilter: "blur(14px)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="py-14 text-center text-ink-muted text-sm">
                  No jobs yet — submit one from the control panel to get started.
                </td>
              </tr>
            )}
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="transition-colors hover:bg-white/70"
                style={{ borderTop: "1px solid var(--hairline)" }}
              >
                <td className="py-2.5 pr-4 tabular text-ink-muted">#{job.id}</td>
                <td className="py-2.5 pr-4 text-ink font-medium whitespace-nowrap">
                  {job.task_name.replace("tasks.", "")}
                </td>
                <td className="py-2.5 pr-4">
                  <StatusChip status={job.status} />
                </td>
                <td className="py-2.5 pr-4 tabular">
                  <span style={{ color: job.retries > 0 ? "var(--status-retry)" : "var(--text-muted)" }}>
                    {job.retries}
                  </span>
                </td>
                <td className="py-2.5 pr-4 tabular text-ink-secondary whitespace-nowrap">
                  {fmtDuration(job.duration_seconds)}
                </td>
                <td className="py-2.5 pr-4 text-ink-secondary truncate max-w-[160px]">
                  {job.worker ?? "—"}
                </td>
                <td className="py-2.5 pr-0 tabular text-ink-muted whitespace-nowrap">
                  {fmtTime(job.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
