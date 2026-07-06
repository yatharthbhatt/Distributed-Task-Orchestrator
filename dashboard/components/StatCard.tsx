import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  accent?: string; // CSS color for the icon chip
}

export function StatCard({ label, value, sublabel, icon: Icon, accent }: StatCardProps) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div
        className="grid place-items-center rounded-xl shrink-0"
        style={{
          width: 44,
          height: 44,
          background: accent ? `color-mix(in srgb, ${accent} 16%, transparent)` : "var(--border)",
          color: accent ?? "var(--text-secondary)",
        }}
      >
        <Icon size={22} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-ink-muted">{label}</div>
        <div className="text-2xl font-semibold tabular leading-tight text-ink">{value}</div>
        {sublabel && <div className="text-xs text-ink-secondary truncate">{sublabel}</div>}
      </div>
    </div>
  );
}
