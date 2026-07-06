"use client";

import { Server, Cpu } from "lucide-react";
import type { Workers } from "@/lib/api";

export function WorkerPanel({ workers }: { workers: Workers | null }) {
  const online = workers?.online ?? false;

  return (
    <div className="card p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-ink">Worker fleet</h2>
        <span
          className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2 py-0.5"
          style={{
            color: online ? "var(--status-success)" : "var(--status-pending)",
            background: online
              ? "color-mix(in srgb, var(--status-success) 14%, transparent)"
              : "color-mix(in srgb, var(--status-pending) 14%, transparent)",
          }}
        >
          <span
            className="inline-block rounded-full"
            style={{ width: 6, height: 6, background: online ? "var(--status-success)" : "var(--status-pending)" }}
          />
          {online ? `${workers?.count} online` : "no distributed workers"}
        </span>
      </div>

      {!online && (
        <div className="flex-1 grid place-items-center text-center px-2">
          <div>
            <Server size={28} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm text-ink-secondary">Running in local eager mode.</p>
            <p className="text-xs text-ink-muted mt-1">
              Start the Docker stack to see horizontally scaled Celery workers here.
            </p>
          </div>
        </div>
      )}

      {online && (
        <ul className="space-y-2 overflow-auto" style={{ maxHeight: 220 }}>
          {workers!.workers.map((w) => (
            <li
              key={w.name}
              className="flex items-center justify-between rounded-lg px-3 py-2 border"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm text-ink truncate">
                  <Cpu size={14} style={{ color: "var(--series-1)" }} />
                  {w.name}
                </div>
                <div className="text-xs text-ink-muted truncate">
                  queues: {w.queues.length ? w.queues.join(", ") : "—"}
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <div className="text-sm tabular text-ink">{w.active} active</div>
                {w.processed != null && (
                  <div className="text-xs tabular text-ink-muted">{w.processed} done</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
