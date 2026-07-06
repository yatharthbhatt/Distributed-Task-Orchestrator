"use client";

/**
 * Semicircular success-rate gauge. A single-value magnitude, so one hue (good
 * green) on a recessive track; the exact percentage is printed, never color-alone.
 */
export function SuccessGauge({ rate, completed }: { rate: number; completed: number }) {
  const pct = Math.round(rate * 1000) / 10; // one decimal
  const radius = 80;
  const stroke = 14;
  const circumference = Math.PI * radius; // semicircle arc length
  const filled = (rate * circumference).toFixed(2);

  return (
    <div className="card p-4 h-full flex flex-col">
      <h2 className="text-sm font-semibold text-ink mb-1">Success rate</h2>
      <p className="text-xs text-ink-muted mb-2">SUCCESS / (SUCCESS + FAILURE)</p>

      <div className="flex-1 grid place-items-center">
        <svg viewBox="0 0 200 118" width="100%" style={{ maxWidth: 240 }}>
          {/* track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--grid)"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          {/* value arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--status-success)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
          />
          <text
            x="100"
            y="92"
            textAnchor="middle"
            className="tabular"
            style={{ fill: "var(--text-primary)", fontSize: 30, fontWeight: 600 }}
          >
            {pct}%
          </text>
        </svg>
      </div>
      <div className="text-center text-xs text-ink-secondary">
        {completed} completed job{completed === 1 ? "" : "s"}
      </div>
    </div>
  );
}
