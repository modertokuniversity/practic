import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "brand" | "green" | "amber" | "red" | "gray" | "blue";

const toneClasses: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200",
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  red: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  gray: "bg-ink-100 text-ink-600 ring-1 ring-inset ring-ink-200",
  blue: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
}

export function Badge({ className, tone = "gray", dot, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
