"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck, AlertTriangle, Clock, CalendarCheck, Info } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@/lib/types";

function iconFor(type: NotificationType) {
  switch (type) {
    case "late_alert":
      return <AlertTriangle size={15} className="text-amber-500" />;
    case "missing_checkout":
      return <Clock size={15} className="text-red-500" />;
    case "leave_status_changed":
      return <CalendarCheck size={15} className="text-brand-600" />;
    case "schedule_published":
      return <CalendarCheck size={15} className="text-sky-500" />;
    default:
      return <Info size={15} className="text-ink-400" />;
  }
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "щойно";
  if (mins < 60) return `${mins} хв тому`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} год тому`;
  const days = Math.round(hours / 24);
  return `${days} дн тому`;
}

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const notifications = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead);

  const mine = notifications.filter((n) => n.userId === currentUserId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unreadCount = mine.filter((n) => !n.isRead).length;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-500 hover:bg-ink-50"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-2xl border border-ink-100 bg-white shadow-pop animate-fade-in">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <p className="text-sm font-semibold text-ink-800">Сповіщення</p>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead(currentUserId)}
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                <CheckCheck size={13} /> Прочитати всі
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {mine.length === 0 && <p className="px-4 py-8 text-center text-xs text-ink-400">Немає сповіщень</p>}
            {mine.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={cn(
                  "flex w-full items-start gap-2.5 border-b border-ink-50 px-4 py-3 text-left last:border-0 hover:bg-ink-50",
                  !n.isRead && "bg-brand-50/40"
                )}
              >
                <div className="mt-0.5">{iconFor(n.type)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-ink-800">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-500">{n.message}</p>
                  <p className="mt-1 text-[10px] text-ink-400">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
