"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ThroughputPoint {
  t: string; // HH:MM:SS label
  value: number; // jobs finished in trailing 60s
}

/** Glass-styled tooltip — the default white card punches a hole in the panel. */
function GlassTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="pill px-3 py-2"
      style={{
        background: "var(--frost)",
        borderRadius: 12,
        boxShadow: "0 10px 28px -12px rgba(24,34,76,0.45)",
      }}
    >
      <div className="text-[10px] uppercase tracking-overline text-ink-muted">{label}</div>
      <div className="text-sm font-semibold tabular text-ink mt-0.5">
        {payload[0].value} <span className="font-normal text-ink-secondary">jobs/min</span>
      </div>
    </div>
  );
}

export function ThroughputChart({ data }: { data: ThroughputPoint[] }) {
  const peak = data.reduce((m, d) => Math.max(m, d.value), 0);
  const latest = data.length ? data[data.length - 1].value : 0;

  return (
    <div className="glass p-6 h-full flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-overline text-ink-muted font-medium">
            Live signal
          </div>
          <h2 className="text-base font-semibold text-ink mt-1.5">Throughput</h2>
          <p className="text-xs text-ink-muted mt-0.5">Jobs completed in the trailing 60&nbsp;s</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[32px] font-semibold tabular leading-none text-ink">{latest}</div>
          <div className="text-xs text-ink-muted tabular mt-1.5">peak {peak}</div>
        </div>
      </div>

      <div className="mt-4 flex-1 min-h-0" style={{ minHeight: 230 }}>
        <ResponsiveContainer width="100%" height="100%">
          {/* No negative left margin: the Y axis has to fit 3-digit tick labels
              once throughput climbs past 99, or they get clipped. */}
          <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="throughput-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.24} />
                <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis
              dataKey="t"
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--baseline)" }}
              minTickGap={48}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip content={<GlassTooltip />} cursor={{ stroke: "var(--baseline)", strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="value"
              name="jobs/min"
              stroke="var(--series-1)"
              strokeWidth={2}
              fill="url(#throughput-fill)"
              dot={false}
              activeDot={{ r: 4, fill: "var(--series-1)", stroke: "#ffffff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
