"use client";

import { useState } from "react";
import { Send, Loader2, Zap } from "lucide-react";
import { api } from "@/lib/api";

/**
 * Dispatch control, shaped for the left rail: task types stack as full-width
 * rows (a vertical menu, not a 2×2 grid of tiles) so the whole panel scans in a
 * single column alongside the telemetry on the right.
 */

type TaskType = "cpu" | "io" | "flaky" | "aggregate";

const TASKS: { value: TaskType; label: string; hint: string }[] = [
  { value: "cpu", label: "CPU-bound", hint: "Count primes below n" },
  { value: "io", label: "IO-bound", hint: "Simulated network wait" },
  { value: "aggregate", label: "Aggregate", hint: "Hash + summarize a stream" },
  { value: "flaky", label: "Flaky", hint: "Fails randomly → exercises retries" },
];

const AMOUNT: Record<TaskType, { label: string; placeholder: string } | null> = {
  cpu: { label: "n — upper bound", placeholder: "50000" },
  io: { label: "seconds to sleep", placeholder: "2" },
  aggregate: { label: "record count", placeholder: "100000" },
  flaky: null, // uses the server-side default failure rate
};

export function SubmitJobForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [taskType, setTaskType] = useState<TaskType>("cpu");
  const [amount, setAmount] = useState("50000");
  const [priority, setPriority] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  function payloadFor(): Record<string, unknown> {
    const n = Number(amount) || 0;
    switch (taskType) {
      case "cpu":
        return { n };
      case "io":
        return { seconds: n };
      case "aggregate":
        return { count: n };
      case "flaky":
        return {};
    }
  }

  async function submit(count = 1) {
    setBusy(true);
    setMsg(null);
    setFailed(false);
    try {
      for (let i = 0; i < count; i++) {
        await api.submit(taskType, payloadFor(), priority);
      }
      setMsg(`Enqueued ${count} ${taskType} job${count > 1 ? "s" : ""}.`);
      onSubmitted();
    } catch (e) {
      setFailed(true);
      setMsg(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  const cfg = AMOUNT[taskType];

  return (
    <section className="glass p-5">
      <div className="text-[10px] uppercase tracking-overline text-ink-muted font-medium">
        Dispatch
      </div>
      <h2 className="text-base font-semibold text-ink mt-1.5 mb-4">Submit a job</h2>

      <div className="space-y-1.5 mb-4">
        {TASKS.map((t) => {
          const on = taskType === t.value;
          return (
            <button
              key={t.value}
              type="button"
              aria-pressed={on}
              onClick={() => setTaskType(t.value)}
              className="glass-hover w-full text-left rounded-xl px-3.5 py-2.5 border flex items-center gap-3"
              style={{
                borderColor: on ? "color-mix(in srgb, var(--series-1) 40%, transparent)" : "var(--hairline)",
                background: on ? "color-mix(in srgb, var(--series-1) 9%, white)" : "var(--tint)",
              }}
            >
              {/* Selection is marked by a ringed dot as well as the fill, so the
                  active row is not signalled by color alone. */}
              <span
                className="rounded-full shrink-0 transition-all"
                style={{
                  width: on ? 8 : 6,
                  height: on ? 8 : 6,
                  background: on ? "var(--series-1)" : "var(--track)",
                  boxShadow: on ? "0 0 0 3px color-mix(in srgb, var(--series-1) 18%, transparent)" : "none",
                }}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{t.label}</span>
                <span className="block text-[11px] text-ink-muted truncate">{t.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {cfg && (
        <label className="block mb-4">
          <span className="block text-[10px] uppercase tracking-overline text-ink-muted font-medium mb-1.5">
            {cfg.label}
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={cfg.placeholder}
            className="glass-inset w-full px-3.5 py-2.5 text-sm bg-transparent tabular text-ink placeholder:text-ink-muted"
          />
        </label>
      )}

      {/* Custom switch — a native checkbox cannot be styled to match the glass. */}
      <button
        type="button"
        role="switch"
        aria-checked={priority}
        onClick={() => setPriority((p) => !p)}
        className="w-full flex items-center justify-between gap-3 mb-5 group"
      >
        <span className="flex items-center gap-2 text-sm text-ink-secondary group-hover:text-ink transition-colors">
          <Zap size={14} style={{ color: priority ? "var(--status-retry)" : "var(--text-muted)" }} />
          Priority queue
        </span>
        <span
          className="relative rounded-full shrink-0 transition-colors"
          style={{
            width: 38,
            height: 22,
            background: priority ? "color-mix(in srgb, var(--status-retry) 22%, white)" : "var(--track)",
            border: `1px solid ${
              priority ? "color-mix(in srgb, var(--status-retry) 45%, transparent)" : "var(--hairline)"
            }`,
          }}
        >
          <span
            className="absolute rounded-full transition-all"
            style={{
              width: 16,
              height: 16,
              top: 2,
              left: priority ? 18 : 2,
              background: priority ? "var(--status-retry)" : "#ffffff",
              boxShadow: "0 1px 3px rgba(24,34,76,0.28)",
            }}
          />
        </span>
      </button>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => submit(1)}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold disabled:opacity-55 transition-transform active:scale-[0.98]"
          style={{
            color: "#ffffff",
            background: "linear-gradient(140deg, #6366f1, #4f46e5 55%, #4338ca)",
            boxShadow: "0 10px 22px -10px rgba(79,70,229,0.75)",
          }}
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Submit
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit(25)}
          title="Enqueue a burst of 25 jobs"
          className="glass-hover rounded-xl px-4 py-2.5 text-sm font-semibold border text-ink disabled:opacity-55 transition-transform active:scale-[0.98]"
          style={{ borderColor: "var(--hairline)", background: "var(--tint)" }}
        >
          ×25
        </button>
      </div>

      {msg && (
        <p
          className="text-[11px] mt-3 leading-snug"
          style={{ color: failed ? "var(--status-failure)" : "var(--text-secondary)" }}
        >
          {msg}
        </p>
      )}
    </section>
  );
}
