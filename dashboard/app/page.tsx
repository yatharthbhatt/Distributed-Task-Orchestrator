"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Boxes, AlertTriangle, Radio } from "lucide-react";
import { api, API_URL, type Job, type Stats, type Workers } from "@/lib/api";
import { KpiBar } from "@/components/KpiBar";
import { PipelinePanel } from "@/components/PipelinePanel";
import { ThroughputChart, type ThroughputPoint } from "@/components/ThroughputChart";
import { JobTable } from "@/components/JobTable";
import { SubmitJobForm } from "@/components/SubmitJobForm";
import { WorkerPanel } from "@/components/WorkerPanel";

/*
  Console layout: controls live in a sticky left rail, telemetry fills the right.
  Everything you *do* stays in one place and everything you *watch* stays in
  another, instead of interleaving inputs and readouts across a uniform card grid.
*/

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
      const [s, j, w] = await Promise.all([
        api.stats(),
        api.jobs(25),
        api.workers().catch(() => null),
      ]);
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

  const live = !error;

  return (
    <div className="min-h-screen max-w-[1560px] mx-auto px-4 py-5 md:px-8 md:py-8">
      {/* grid-cols-1 (not bare `grid`) matters: an implicit single column is
          auto-sized, so the wide job table would push the page horizontally. */}
      <div className="grid grid-cols-1 gap-5 lg:gap-6 lg:grid-cols-[312px_minmax(0,1fr)] items-start">
        {/* ── Control rail ─────────────────────────────────────────────── */}
        <aside className="space-y-5 min-w-0 lg:sticky lg:top-8">
          <section className="glass p-5">
            <div className="flex items-center gap-3">
              <span
                className="grid place-items-center rounded-2xl shrink-0"
                style={{
                  width: 44,
                  height: 44,
                  background: "linear-gradient(140deg, #eef0ff, #dbe4ff 55%, #e9dcff)",
                  border: "1px solid var(--rim)",
                  boxShadow: "0 6px 16px -10px rgba(79,70,229,0.7)",
                }}
              >
                <Boxes size={22} style={{ color: "var(--series-1)" }} />
              </span>
              <div className="min-w-0">
                <h1 className="text-[17px] font-semibold text-ink leading-tight tracking-tight">
                  OrchestraX
                </h1>
                <p className="text-[11px] text-ink-muted mt-0.5">Distributed job queue</p>
              </div>
            </div>

            <div
              className="mt-4 pt-4 space-y-2.5"
              style={{ borderTop: "1px solid var(--hairline)" }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-ink-muted">Stream</span>
                <span
                  className="pill inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1"
                  style={{
                    color: live ? "var(--status-success)" : "var(--status-failure)",
                    background: `color-mix(in srgb, ${
                      live ? "var(--status-success)" : "var(--status-failure)"
                    } 11%, white)`,
                    borderColor: `color-mix(in srgb, ${
                      live ? "var(--status-success)" : "var(--status-failure)"
                    } 26%, transparent)`,
                  }}
                >
                  <span
                    className={`inline-block rounded-full ${live ? "breathe" : ""}`}
                    style={{
                      width: 5,
                      height: 5,
                      background: live ? "var(--status-success)" : "var(--status-failure)",
                    }}
                  />
                  {live ? "Live" : "Offline"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-ink-muted">In flight</span>
                <span className="text-[11px] tabular text-ink font-medium">
                  {stats?.active_jobs ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-ink-muted">Poll interval</span>
                <span className="text-[11px] tabular text-ink-secondary">{POLL_MS / 1000}s</span>
              </div>
            </div>
          </section>

          {error && (
            <div
              className="glass p-4 flex items-start gap-2.5 text-[12px] leading-snug"
              style={{
                color: "var(--status-failure)",
                borderColor: "color-mix(in srgb, var(--status-failure) 34%, transparent)",
              }}
            >
              <AlertTriangle size={15} className="shrink-0 mt-px" />
              <span>
                {error}
                <span className="block text-ink-muted mt-1">
                  Is the API running at {API_URL}?
                </span>
              </span>
            </div>
          )}

          <SubmitJobForm onSubmitted={refresh} />
          <WorkerPanel workers={workers} />

          <p className="text-[10px] text-ink-muted text-center leading-relaxed px-2">
            Celery · Redis · PostgreSQL · FastAPI
            <span className="block mt-1 tabular opacity-70">{API_URL}</span>
          </p>
        </aside>

        {/* ── Telemetry column ─────────────────────────────────────────── */}
        <main className="space-y-5 lg:space-y-6 min-w-0">
          <header className="flex flex-wrap items-end justify-between gap-4 px-1">
            <div>
              <div className="text-[10px] uppercase tracking-overline text-ink-muted font-medium">
                Live control surface
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold text-ink mt-2 leading-tight">
                Fault-tolerant job orchestration
              </h2>
            </div>
            <span className="pill inline-flex items-center gap-2 px-3 py-1.5 text-[11px] text-ink-secondary">
              <Radio size={13} style={{ color: "var(--series-1)" }} />
              Auto-refreshing every {POLL_MS / 1000}s
            </span>
          </header>

          <KpiBar stats={stats} />

          {/* Asymmetric split: the time series gets the width it needs to be
              readable, the composition panel gets just enough. */}
          <div className="grid gap-5 lg:gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-stretch">
            <ThroughputChart data={series} />
            <PipelinePanel stats={stats} />
          </div>

          <JobTable jobs={jobs} />
        </main>
      </div>
    </div>
  );
}
