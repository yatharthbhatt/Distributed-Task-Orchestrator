"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

type TaskType = "cpu" | "io" | "flaky" | "aggregate";

const TASKS: { value: TaskType; label: string; hint: string }[] = [
  { value: "cpu", label: "CPU-bound", hint: "Count primes below n" },
  { value: "io", label: "IO-bound", hint: "Simulated wait" },
  { value: "aggregate", label: "Aggregate", hint: "Hash + summarize a stream" },
  { value: "flaky", label: "Flaky", hint: "Fails randomly → tests retries" },
];

export function SubmitJobForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [taskType, setTaskType] = useState<TaskType>("cpu");
  const [amount, setAmount] = useState("50000");
  const [priority, setPriority] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
        return {}; // uses server default failure rate
    }
  }

  const amountConfig: Record<TaskType, { label: string; placeholder: string } | null> = {
    cpu: { label: "n (upper bound)", placeholder: "50000" },
    io: { label: "seconds to sleep", placeholder: "2" },
    aggregate: { label: "record count", placeholder: "100000" },
    flaky: null,
  };

  async function submit(count = 1) {
    setBusy(true);
    setMsg(null);
    try {
      for (let i = 0; i < count; i++) {
        await api.submit(taskType, payloadFor(), priority);
      }
      setMsg(`Enqueued ${count} ${taskType} job${count > 1 ? "s" : ""}.`);
      onSubmitted();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  const cfg = amountConfig[taskType];

  return (
    <div className="card p-4 h-full flex flex-col">
      <h2 className="text-sm font-semibold text-ink mb-3">Submit a job</h2>

      <label className="text-xs text-ink-muted mb-1">Task type</label>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {TASKS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTaskType(t.value)}
            className="text-left rounded-lg px-3 py-2 border transition-colors"
            style={{
              borderColor: taskType === t.value ? "var(--series-1)" : "var(--border)",
              background:
                taskType === t.value ? "color-mix(in srgb, var(--series-1) 12%, transparent)" : "transparent",
            }}
          >
            <div className="text-sm font-medium text-ink">{t.label}</div>
            <div className="text-xs text-ink-muted">{t.hint}</div>
          </button>
        ))}
      </div>

      {cfg && (
        <div className="mb-3">
          <label className="text-xs text-ink-muted mb-1 block">{cfg.label}</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={cfg.placeholder}
            className="w-full rounded-lg px-3 py-2 text-sm bg-transparent border tabular text-ink"
            style={{ borderColor: "var(--border)" }}
          />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-ink-secondary mb-4 select-none">
        <input type="checkbox" checked={priority} onChange={(e) => setPriority(e.target.checked)} />
        Route to priority queue
      </label>

      <div className="mt-auto flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => submit(1)}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ background: "var(--series-1)" }}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Submit
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit(25)}
          className="rounded-lg px-3 py-2 text-sm font-medium border disabled:opacity-60 text-ink"
          style={{ borderColor: "var(--border)" }}
          title="Enqueue a burst of 25 jobs"
        >
          ×25
        </button>
      </div>

      {msg && <p className="text-xs text-ink-secondary mt-2">{msg}</p>}
    </div>
  );
}
