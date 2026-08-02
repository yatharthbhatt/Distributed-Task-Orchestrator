"use client";

import type { Stats } from "@/lib/api";

/**
 * The headline metrics, arranged as one continuous glass slab divided by fading
 * hairlines rather than four detached cards. A single pane reads as one
 * instrument; four cards read as four widgets that happen to sit near each other.
 */

interface Segment {
  label: string;
  value: string;
  foot: string;
  accent: string;
}

const DIVIDER =
  "linear-gradient(180deg, transparent, var(--rule) 22%, var(--rule) 78%, transparent)";

function fmtDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  return `${seconds.toFixed(2)} s`;
}

export function KpiBar({ stats }: { stats: Stats | null }) {
  const segments: Segment[] = [
    {
      label: "Total dispatched",
      value: String(stats?.total ?? 0),
      foot: `${stats?.active_jobs ?? 0} in flight`,
      accent: "var(--series-1)",
    },
    {
      label: "Succeeded",
      value: String(stats?.by_status?.SUCCESS ?? 0),
      foot: `${Math.round((stats?.completion_rate ?? 0) * 100)}% completed`,
      accent: "var(--status-success)",
    },
    {
      label: "Failed",
      value: String(stats?.by_status?.FAILURE ?? 0),
      foot: `${stats?.by_status?.RETRY ?? 0} retrying`,
      accent: "var(--status-failure)",
    },
    {
      label: "Throughput",
      value: (stats?.throughput_per_min ?? 0).toFixed(0),
      foot: `jobs/min · avg ${fmtDuration(stats?.avg_duration_seconds)}`,
      accent: "var(--status-retry)",
    },
  ];

  return (
    <div className="glass overflow-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {segments.map((s, i) => (
          <div key={s.label} className="relative px-5 py-5 lg:px-6 lg:py-6">
            {/* Vertical rule: every segment but the first on desktop, every
                right-hand column on the two-up mobile grid. */}
            <span
              aria-hidden="true"
              className={`absolute left-0 top-4 bottom-4 w-px ${
                i === 0 ? "hidden" : i % 2 === 1 ? "block" : "hidden lg:block"
              }`}
              style={{ background: DIVIDER }}
            />
            {/* Horizontal rule between the two mobile rows only. */}
            {i > 1 && (
              <span
                aria-hidden="true"
                className="absolute left-4 right-4 top-0 h-px lg:hidden"
                style={{ background: "var(--hairline)" }}
              />
            )}

            <div className="flex items-center gap-2">
              {/* No glow on the light canvas — a ring reads as a marker instead. */}
              <span
                className="inline-block rounded-full shrink-0"
                style={{
                  width: 7,
                  height: 7,
                  background: s.accent,
                  boxShadow: `0 0 0 3px color-mix(in srgb, ${s.accent} 16%, transparent)`,
                }}
              />
              <span className="text-[10px] uppercase tracking-overline text-ink-muted font-medium">
                {s.label}
              </span>
            </div>

            <div className="mt-2.5 text-[32px] lg:text-[40px] font-semibold tabular leading-none text-ink">
              {s.value}
            </div>
            <div className="mt-1.5 text-xs text-ink-secondary tabular">{s.foot}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
