"use client";

import { Bell, CheckCheck, AlertTriangle, Clock, CalendarCheck, Info } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SectionHeading, EmptyState } from "@/components/ui/Misc";
import type { NotificationType } from "@/lib/types";

function iconFor(type: NotificationType) {
  switch (type) {
    case "late_alert":
      return <AlertTriangle size={18} className="text-amber-500" />;
    case "missing_checkout":
      return <Clock size={18} className="text-red-500" />;
    case "leave_status_changed":
      return <CalendarCheck size={18} className="text-brand-600" />;
    case "schedule_published":
      return <CalendarCheck size={18} className="text-sky-500" />;
    default:
      return <Info size={18} className="text-ink-400" />;
  }
}

export default function NotificationsPage() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const notifications = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead);

  const mine = notifications.filter((n) => n.userId === currentUserId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = mine.filter((n) => !n.isRead).length;

  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeading
        title="Сповіщення"
        subtitle={unread > 0 ? `${unread} непрочитаних` : "Усе прочитано"}
        action={
          unread > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllRead(currentUserId)}>
              <CheckCheck size={14} /> Прочитати всі
            </Button>
          )
        }
      />

      <Card>
        <CardBody className="p-0">
          {mine.length === 0 ? (
            <EmptyState icon={Bell} title="Немає сповіщень" />
          ) : (
            <div className="divide-y divide-ink-100">
              {mine.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-ink-50 ${!n.isRead ? "bg-brand-50/40" : ""}`}
                >
                  <div className="mt-0.5">{iconFor(n.type)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-800">{n.title}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{n.message}</p>
                    <p className="mt-1.5 text-[11px] text-ink-400">{new Date(n.createdAt).toLocaleString("uk-UA")}</p>
                  </div>
                  {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
