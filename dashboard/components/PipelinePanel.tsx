"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { STATUS_COLORS, type JobStatus, type Stats } from "@/lib/api";

/**
 * Status breakdown and success rate, merged into one instrument.
 *
 * They answer the same question at two zoom levels — "where is everything?" and
 * "of the work that finished, how much held up?" — so splitting them across two
 * panels made the eye do the joining. The donut carries the distribution; the
 * arc beneath it carries the verdict. Counts are printed next to every swatch,
 * so nothing here depends on color perception.
 */

const ORDER: JobStatus[] = ["SUCCESS", "STARTED", "RETRY", "PENDING", "FAILURE"];

export function PipelinePanel({ stats }: { stats: Stats | null }) {
  const total = stats?.total ?? 0;
  const slices = ORDER.map((status) => ({ status, value: stats?.by_status?.[status] ?? 0 })).filter(
    (d) => d.value > 0,
  );

  const rate = stats?.success_rate ?? 0;
  const completed = (stats?.by_status?.SUCCESS ?? 0) + (stats?.by_status?.FAILURE ?? 0);
  const pct = Math.round(rate * 1000) / 10;

  // Semicircular arc geometry for the success gauge.
  const radius = 80;
  const circumference = Math.PI * radius;
  const filled = (rate * circumference).toFixed(2);

  return (
    <div className="glass p-6 h-full flex flex-col">
      <div className="text-[10px] uppercase tracking-overline text-ink-muted font-medium">
        Pipeline
      </div>
      <h2 className="text-base font-semibold text-ink mt-1.5">Status distribution</h2>

      {/* Donut on the left, keyed legend on the right. */}
      <div className="mt-4 flex items-center gap-5">
        <div className="relative shrink-0" style={{ width: 152, height: 152 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices.length ? slices : [{ status: "PENDING", value: 1 }]}
                dataKey="value"
                nameKey="status"
                innerRadius={52}
                outerRadius={74}
                paddingAngle={slices.length > 1 ? 3 : 0}
                stroke="none"
                isAnimationActive={false}
              >
                {(slices.length ? slices : [{ status: "PENDING" as JobStatus }]).map((d) => (
                  <Cell
                    key={d.status}
                    fill={slices.length ? STATUS_COLORS[d.status as JobStatus] : "var(--track)"}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="text-center">
              <div className="text-3xl font-semibold tabular text-ink leading-none">{total}</div>
              <div className="text-[10px] uppercase tracking-overline text-ink-muted mt-1.5">jobs</div>
            </div>
          </div>
        </div>

        <ul className="flex-1 min-w-0 space-y-1.5">
          {ORDER.map((status) => {
            const count = stats?.by_status?.[status] ?? 0;
            const share = total > 0 ? count / total : 0;
            return (
              <li key={status} className="flex items-center gap-2.5 text-xs">
                <span
                  className="inline-block rounded-full shrink-0"
                  style={{ width: 7, height: 7, background: STATUS_COLORS[status] }}
                />
                <span className="text-ink-secondary w-[62px] shrink-0">{status}</span>
                {/* Micro-bar restates the proportion positionally, not just by hue. */}
                <span className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--track)" }}>
                  <span
                    className="block h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${share * 100}%`, background: STATUS_COLORS[status] }}
                  />
                </span>
                <span className="tabular text-ink font-medium w-8 text-right shrink-0">{count}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Success arc — the verdict on everything that reached a terminal state. */}
      <div
        className="mt-5 pt-5 flex items-center gap-5"
        style={{ borderTop: "1px solid var(--hairline)" }}
      >
        <svg viewBox="0 0 200 108" width={152} className="shrink-0" role="img" aria-label={`Success rate ${pct}%`}>
          <defs>
            <linearGradient id="gauge-fill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--series-1)" />
              <stop offset="100%" stopColor="var(--status-success)" />
            </linearGradient>
          </defs>
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--track)"
            strokeWidth={12}
            strokeLinecap="round"
          />
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gauge-fill)"
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            style={{ transition: "stroke-dasharray 600ms ease" }}
          />
          <text
            x="100"
            y="94"
            textAnchor="middle"
            className="tabular"
            style={{ fill: "var(--text-primary)", fontSize: 32, fontWeight: 600 }}
          >
            {pct}%
          </text>
        </svg>

        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-overline text-ink-muted font-medium">
            Success rate
          </div>
          <p className="text-sm text-ink-secondary mt-1.5 leading-snug">
            {completed} job{completed === 1 ? "" : "s"} reached a terminal state.
          </p>
          <p className="text-xs text-ink-muted mt-1">SUCCESS / (SUCCESS + FAILURE)</p>
        </div>
      </div>
    </div>
  );
}
