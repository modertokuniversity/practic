"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { userById, users, shiftTemplates } from "@/lib/mock/reference";
import { schedules } from "@/lib/mock/attendance";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs } from "@/components/ui/Tabs";
import { SectionHeading } from "@/components/ui/Misc";
import { toLocalISODate } from "@/lib/utils";
import { apiRequest, getAccessToken } from "@/lib/api";
import type { Schedule } from "@/lib/types";

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function SchedulePage() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const me = userById(currentUserId)!;
  const isManagerLike = me.role === "manager" || me.role === "hr_admin" || me.role === "admin";
  const [weekOffset, setWeekOffset] = useState<"0" | "1">("0");
  const [scheduleRows, setScheduleRows] = useState<Schedule[]>(schedules);

  const monday = mondayOf(new Date());
  monday.setDate(monday.getDate() + Number(weekOffset) * 7);
  const days = weekDays(monday);

  useEffect(() => {
    if (!getAccessToken()) return;
    const from = toLocalISODate(days[0]);
    const to = toLocalISODate(days[6]);
    apiRequest<Schedule[]>(`/schedules?from=${from}&to=${to}`)
      .then(setScheduleRows)
      .catch((error) => console.error("Could not load the schedule from the API:", error));
  }, [weekOffset, currentUserId]);

  const people = isManagerLike ? users.filter((u) => (me.role === "manager" ? u.departmentId === me.departmentId : u.isActive)) : [me];

  const byUserDay = useMemo(() => {
    const map = new Map<string, (typeof schedules)[number]>();
    scheduleRows.forEach((s) => map.set(`${s.userId}_${s.workDate}`, s));
    return map;
  }, [scheduleRows]);

  return (
    <div className="mx-auto max-w-6xl">
      <SectionHeading
        title="Графік змін"
        subtitle={isManagerLike ? "Плановий графік підрозділу" : "Ваш плановий графік"}
        action={
          <Tabs
            value={weekOffset}
            onChange={(v) => setWeekOffset(v as "0" | "1")}
            items={[
              { value: "0", label: "Цей тиждень" },
              { value: "1", label: "Наступний тиждень" },
            ]}
          />
        }
      />

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                <th className="w-56 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-400">Працівник</th>
                {days.map((d) => (
                  <th key={d.toISOString()} className="px-2 py-3 text-center text-xs font-medium text-ink-500">
                    <div className="capitalize">{d.toLocaleDateString("uk-UA", { weekday: "short" })}</div>
                    <div className="text-ink-300">{d.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" })}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {people.map((u) => (
                <tr key={u.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.fullName} color={u.avatarColor} size={26} />
                      <span className="whitespace-nowrap text-xs font-medium text-ink-700">{u.fullName}</span>
                    </div>
                  </td>
                  {days.map((d) => {
                    const iso = toLocalISODate(d);
                    const s = byUserDay.get(`${u.id}_${iso}`);
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    const tmpl = s ? shiftTemplates.find((t) => t.id === s.shiftTemplateId) : null;
                    return (
                      <td key={iso} className="px-2 py-3 text-center">
                        {isWeekend || !s ? (
                          <span className="text-xs text-ink-200">—</span>
                        ) : (
                          <span className="inline-block whitespace-nowrap rounded-lg bg-brand-50 px-2 py-1 text-[11px] font-medium text-brand-700">
                            {tmpl?.startTime}–{tmpl?.endTime}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
