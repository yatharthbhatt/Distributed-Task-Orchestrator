"use client";

import { Server, Cpu } from "lucide-react";
import type { Workers } from "@/lib/api";

/**
 * The Celery fleet, as reported by `celery inspect`. In local eager mode there
 * is no broker to inspect, so the panel explains that instead of showing zeros —
 * an empty fleet and an absent fleet are different states.
 */
export function WorkerPanel({ workers }: { workers: Workers | null }) {
  const online = workers?.online ?? false;
  const accent = online ? "var(--status-success)" : "var(--status-pending)";

  return (
    <section className="glass p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-overline text-ink-muted font-medium">
            Fleet
          </div>
          <h2 className="text-base font-semibold text-ink mt-1.5">Workers</h2>
        </div>
        <span
          className="pill inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 shrink-0"
          style={{
            color: accent,
            background: `color-mix(in srgb, ${accent} 11%, white)`,
            borderColor: `color-mix(in srgb, ${accent} 26%, transparent)`,
          }}
        >
          <span
            className="inline-block rounded-full"
            style={{ width: 5, height: 5, background: accent }}
          />
          {online ? `${workers?.count} online` : "eager mode"}
        </span>
      </div>

      {!online ? (
        <div className="glass-inset px-4 py-5 text-center">
          <Server size={24} className="mx-auto mb-2.5" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm text-ink-secondary leading-snug">
            Tasks are running in-process.
          </p>
          <p className="text-[11px] text-ink-muted mt-1.5 leading-snug">
            Start the Docker stack to see horizontally scaled Celery workers appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2 overflow-auto scroll-glass" style={{ maxHeight: 260 }}>
          {workers!.workers.map((w) => (
            <li key={w.name} className="glass-inset glass-hover px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Cpu size={13} className="shrink-0" style={{ color: "var(--series-1)" }} />
                  <span className="text-sm text-ink truncate">{w.name}</span>
                </div>
                <span className="text-xs tabular shrink-0" style={{ color: "var(--series-1)" }}>
                  {w.active} active
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 mt-1.5">
                <span className="text-[11px] text-ink-muted truncate">
                  {w.queues.length ? w.queues.join(" · ") : "no queues"}
                </span>
                {w.processed != null && (
                  <span className="text-[11px] tabular text-ink-muted shrink-0">{w.processed} done</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
