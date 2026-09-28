"use client";

import Link from "next/link";
import { Square, Timer as TimerIcon } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useTicker } from "@/lib/useTicker";
import { secondsToClock } from "@/lib/utils";
import { summarizeSegments } from "@/lib/timer";

export function MiniTimerPill() {
  const timer = useAppStore((s) => s.timer);
  const projects = useAppStore((s) => s.projects);
  const stopTimer = useAppStore((s) => s.stopTimer);
  useTicker(timer.status !== "idle");

  if (timer.status === "idle") return null;

  const totals = summarizeSegments(timer.segments);
  const elapsedSec = Math.floor((totals.workMs + totals.pauseMs + totals.lunchMs) / 1000);
  const project = projects.find((p) => p.id === timer.projectId);
  const isPaused = timer.status === "pause" || timer.status === "lunch";

  return (
    <div className={`flex items-center gap-2 rounded-xl border py-1.5 pl-3 pr-1.5 ${isPaused ? "border-amber-200 bg-amber-50" : "border-brand-200 bg-brand-50 animate-pulse-ring"}`}>
      <TimerIcon size={14} className={isPaused ? "text-amber-600" : "text-brand-600"} />
      <Link href="/tracker" className={`hidden text-xs font-medium hover:underline sm:inline ${isPaused ? "text-amber-700" : "text-brand-700"}`}>
        {project ? project.name : "Без проєкту"}
        {timer.status === "pause" ? " · пауза" : timer.status === "lunch" ? " · обід" : ""}
      </Link>
      <span className={`font-mono text-sm font-semibold tabular-nums ${isPaused ? "text-amber-700" : "text-brand-700"}`}>{secondsToClock(elapsedSec)}</span>
      <button
        onClick={stopTimer}
        className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700"
        title="Зупинити таймер"
      >
        <Square size={11} fill="currentColor" />
      </button>
    </div>
  );
}
