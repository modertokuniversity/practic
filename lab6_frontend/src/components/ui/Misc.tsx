import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProgressBar({ value, max, colorClass = "bg-brand-600" }: { value: number; max: number; colorClass?: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
      <div className={cn("h-full rounded-full transition-all", colorClass)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
        <Icon size={22} />
      </div>
      <p className="text-sm font-medium text-ink-700">{title}</p>
      {description && <p className="max-w-xs text-xs text-ink-400">{description}</p>}
    </div>
  );
}

export function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function KpiDelta({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={cn("text-xs font-semibold", positive ? "text-emerald-600" : "text-red-500")}>
      {positive ? "+" : ""}
      {value}%
    </span>
  );
}
