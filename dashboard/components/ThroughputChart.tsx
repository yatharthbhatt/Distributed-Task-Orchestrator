"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ThroughputPoint {
  t: string; // HH:MM:SS label
  value: number; // jobs finished in trailing 60s
}

export function ThroughputChart({ data }: { data: ThroughputPoint[] }) {
  return (
    <div className="card p-4 h-full flex flex-col">
      <h2 className="text-sm font-semibold text-ink mb-1">Throughput</h2>
      <p className="text-xs text-ink-muted mb-2">Jobs completed in the trailing 60&nbsp;s</p>

      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis
              dataKey="t"
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--baseline)" }}
              minTickGap={40}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                color: "var(--text-primary)",
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--text-secondary)" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              name="jobs/min"
              stroke="var(--series-1)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
