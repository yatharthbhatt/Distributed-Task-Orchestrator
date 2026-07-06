"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { STATUS_COLORS, type JobStatus, type Stats } from "@/lib/api";

const ORDER: JobStatus[] = ["SUCCESS", "STARTED", "RETRY", "PENDING", "FAILURE"];

export function StatusPie({ stats }: { stats: Stats | null }) {
  const data = ORDER.map((status) => ({
    status,
    value: stats?.by_status?.[status] ?? 0,
  })).filter((d) => d.value > 0);

  const total = stats?.total ?? 0;

  return (
    <div className="card p-4 h-full flex flex-col">
      <h2 className="text-sm font-semibold text-ink mb-1">Job status breakdown</h2>
      <p className="text-xs text-ink-muted mb-2">Distribution across the pipeline</p>

      <div className="relative" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.length ? data : [{ status: "PENDING", value: 1 }]}
              dataKey="value"
              nameKey="status"
              innerRadius={58}
              outerRadius={84}
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke="var(--surface)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {(data.length ? data : [{ status: "PENDING" as JobStatus }]).map((d) => (
                <Cell key={d.status} fill={STATUS_COLORS[d.status as JobStatus]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                color: "var(--text-primary)",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            <div className="text-3xl font-semibold tabular text-ink leading-none">{total}</div>
            <div className="text-xs text-ink-muted mt-1">total jobs</div>
          </div>
        </div>
      </div>

      {/* Legend — every status carries a text label (never color-alone). */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
        {ORDER.map((status) => (
          <li key={status} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-ink-secondary">
              <span
                className="inline-block rounded-sm"
                style={{ width: 10, height: 10, background: STATUS_COLORS[status] }}
              />
              {status}
            </span>
            <span className="tabular text-ink font-medium">{stats?.by_status?.[status] ?? 0}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
