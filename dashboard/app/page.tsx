"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, CheckCircle2, XCircle, Gauge, AlertCircle } from "lucide-react";
import { api, API_URL, type Job, type Stats, type Workers } from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { StatusPie } from "@/components/StatusPie";
import { ThroughputChart, type ThroughputPoint } from "@/components/ThroughputChart";
import { SuccessGauge } from "@/components/SuccessGauge";
import { JobTable } from "@/components/JobTable";
import { SubmitJobForm } from "@/components/SubmitJobForm";
import { WorkerPanel } from "@/components/WorkerPanel";

const POLL_MS = 2000;
const MAX_POINTS = 30;

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workers, setWorkers] = useState<Workers | null>(null);
  const [series, setSeries] = useState<ThroughputPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [s, j, w] = await Promise.all([api.stats(), api.jobs(25), api.workers().catch(() => null)]);
      setStats(s);
      setJobs(j.items);
      if (w) setWorkers(w);
      setError(null);
      setSeries((prev) => {
        const label = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        return [...prev, { t: label, value: s.throughput_per_min }].slice(-MAX_POINTS);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot reach API");
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const loop = async () => {
      await refresh();
      if (alive) timer.current = setTimeout(loop, POLL_MS);
    };
    loop();
    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [refresh]);

  const successPct = stats ? `${Math.round(stats.success_rate * 100)}%` : "—";
  const avg =
    stats?.avg_duration_seconds != null
      ? stats.avg_duration_seconds < 1
        ? `${Math.round(stats.avg_duration_seconds * 1000)} ms`
        : `${stats.avg_duration_seconds.toFixed(2)} s`
      : "—";

  return (
    <main className="min-h-screen p-5 md:p-8 max-w-[1400px] mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-ink flex items-center gap-2">
            <Activity size={24} style={{ color: "var(--series-1)" }} />
            Distributed Task Orchestrator
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Fault-tolerant job queue · Celery + Redis · live view
          </p>
        </div>
        <span
          className="inline-flex items-center gap-2 text-xs rounded-full px-3 py-1.5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          <span
            className="inline-block rounded-full animate-pulse"
            style={{ width: 8, height: 8, background: error ? "var(--status-failure)" : "var(--status-success)" }}
          />
          {error ? "API unreachable" : "Live"} · {stats?.active_jobs ?? 0} active
        </span>
      </header>

      {error && (
        <div
          className="mb-5 rounded-lg px-4 py-3 text-sm flex items-center gap-2"
          style={{ background: "color-mix(in srgb, var(--status-failure) 10%, transparent)", color: "var(--status-failure)" }}
        >
          <AlertCircle size={16} /> {error} — is the API running at the configured URL?
        </div>
      )}

      {/* KPI row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total jobs" value={stats?.total ?? 0} icon={Gauge} accent="var(--series-1)" />
        <StatCard
          label="Succeeded"
          value={stats?.by_status?.SUCCESS ?? 0}
          icon={CheckCircle2}
          accent="var(--status-success)"
        />
        <StatCard
          label="Failed"
          value={stats?.by_status?.FAILURE ?? 0}
          icon={XCircle}
          accent="var(--status-failure)"
        />
        <StatCard label="Success rate" value={successPct} sublabel={`avg ${avg}`} icon={Activity} accent="var(--status-success)" />
      </section>

      {/* Charts row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <StatusPie stats={stats} />
        <div className="lg:col-span-2">
          <ThroughputChart data={series} />
        </div>
      </section>

      {/* Gauge + submit + workers */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <SuccessGauge
          rate={stats?.success_rate ?? 0}
          completed={(stats?.by_status?.SUCCESS ?? 0) + (stats?.by_status?.FAILURE ?? 0)}
        />
        <SubmitJobForm onSubmitted={refresh} />
        <WorkerPanel workers={workers} />
      </section>

      {/* Job table */}
      <section>
        <JobTable jobs={jobs} />
      </section>

      <footer className="text-center text-xs text-ink-muted mt-8">
        Polling every {POLL_MS / 1000}s · API base <span className="tabular">{API_URL}</span>
      </footer>
    </main>
  );
}
