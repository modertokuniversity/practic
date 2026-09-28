"use client";

import { cn } from "@/lib/utils";

export function Tabs({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (v: string) => void;
  items: { value: string; label: string; count?: number }[];
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-ink-100 p-1">
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
            value === item.value ? "bg-white text-ink-800 shadow-sm" : "text-ink-500 hover:text-ink-700"
          )}
        >
          {item.label}
          {item.count !== undefined && (
            <span
              className={cn(
                "rounded-full px-1.5 text-xs",
                value === item.value ? "bg-brand-100 text-brand-700" : "bg-ink-200 text-ink-500"
              )}
            >
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
