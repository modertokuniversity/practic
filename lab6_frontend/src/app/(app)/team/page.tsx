"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ShieldAlert, Pencil, Check, X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { userById, users, departments, positionById } from "@/lib/mock/reference";
import { apiRequest, getAccessToken } from "@/lib/api";
import type { User } from "@/lib/types";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Field";
import { SectionHeading, EmptyState } from "@/components/ui/Misc";
import { roleLabel } from "@/components/layout/Sidebar";
import { totalHoursThisWeek } from "@/lib/stats";
import { canSetHourlyRate } from "@/lib/permissions";

export default function TeamPage() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const timeEntries = useAppStore((s) => s.timeEntries);
  const hourlyRates = useAppStore((s) => s.hourlyRates);
  const setHourlyRate = useAppStore((s) => s.setHourlyRate);
  const me = userById(currentUserId)!;
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState<number | "all">(me.role === "manager" ? me.departmentId ?? "all" : "all");
  const [rateEditId, setRateEditId] = useState<number | null>(null);
  const [rateDraft, setRateDraft] = useState("");
  const [teamUsers, setTeamUsers] = useState<User[]>(users);
  const canEditRate = canSetHourlyRate(me);

  useEffect(() => {
    if (!getAccessToken()) return;
    apiRequest<Array<Omit<User, "avatarColor"> & { avatarColor?: string }>>("/users")
      .then((rows) => setTeamUsers(rows.map((u) => ({ ...u, avatarColor: u.avatarColor ?? users.find((seed) => seed.id === u.id)?.avatarColor ?? "#7C3AED" }))))
      .catch((error) => console.error("Could not load the team from the API:", error));
  }, []);

  if (me.role === "employee") {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <ShieldAlert className="mx-auto mb-3 text-ink-300" size={36} />
        <h2 className="text-base font-semibold text-ink-700">Доступ обмежено</h2>
        <p className="mt-1 text-sm text-ink-400">Цей розділ доступний керівникам підрозділів, HR та адміністраторам.</p>
      </div>
    );
  }

  const scoped = me.role === "manager" ? teamUsers.filter((u) => u.departmentId === me.departmentId) : teamUsers;

  const filtered = useMemo(() => {
    return scoped
      .filter((u) => (deptFilter === "all" ? true : u.departmentId === deptFilter))
      .filter((u) => u.fullName.toLowerCase().includes(query.toLowerCase()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped.map((u) => u.id).join(","), deptFilter, query]);

  return (
    <div className="mx-auto max-w-6xl">
      <SectionHeading title="Команда" subtitle={`${filtered.length} співробітників`} />

      <Card className="mb-4">
        <CardBody className="flex flex-wrap items-center gap-3 py-3.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <Input className="pl-9" placeholder="Пошук за ім'ям…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {me.role !== "manager" && (
            <Select className="w-56" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value === "all" ? "all" : Number(e.target.value))}>
              <option value="all">Усі підрозділи</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          )}
        </CardBody>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="Нікого не знайдено" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((u) => {
            const dept = departments.find((d) => d.id === u.departmentId);
            const hours = totalHoursThisWeek(timeEntries, u.id);
            const rate = hourlyRates[u.id] ?? u.hourlyRate;
            const isEditingRate = rateEditId === u.id;
            return (
              <Card key={u.id} className="h-full p-5 transition-shadow hover:shadow-pop">
                <Link href="/timesheet" className="block">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.fullName} color={u.avatarColor} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-800">{u.fullName}</p>
                      <p className="truncate text-xs text-ink-400">{positionById(u.positionId)?.title}</p>
                    </div>
                    {!u.isActive && <Badge tone="gray">Неактивний</Badge>}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <Badge tone={dept ? "brand" : "gray"} style={dept ? { backgroundColor: `${dept.color}14`, color: dept.color } : undefined}>
                      {dept?.name ?? "Без підрозділу"}
                    </Badge>
                    <span className="text-ink-400">{roleLabel(u.role)}</span>
                  </div>
                  <div className="mt-3 border-t border-ink-100 pt-3 text-xs text-ink-500">
                    Цей тиждень: <span className="font-semibold text-ink-700">{hours} год</span>
                  </div>
                </Link>
                {canEditRate && (
                  <div className="mt-2 flex items-center justify-between border-t border-ink-100 pt-2 text-xs">
                    <span className="text-ink-500">Ставка / год</span>
                    {isEditingRate ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                        <Input
                          type="number"
                          min={0}
                          autoFocus
                          value={rateDraft}
                          onChange={(e) => setRateDraft(e.target.value)}
                          className="h-7 w-20 px-2 text-xs"
                        />
                        <button
                          onClick={() => {
                            const val = Number(rateDraft);
                            if (val > 0) setHourlyRate(u.id, val);
                            setRateEditId(null);
                          }}
                          className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                        >
                          <Check size={14} />
                        </button>
                        <button onClick={() => setRateEditId(null)} className="rounded p-1 text-ink-400 hover:bg-ink-100">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setRateEditId(u.id);
                          setRateDraft(String(rate));
                        }}
                        className="flex items-center gap-1 font-semibold text-ink-700 hover:text-brand-600"
                      >
                        {rate} ₴ <Pencil size={11} />
                      </button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
