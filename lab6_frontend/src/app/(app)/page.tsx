"use client";

import Link from "next/link";
import { Clock, Users, AlertTriangle, Plane, CheckCircle2, ArrowUpRight, Play } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { userById, departmentById } from "@/lib/mock/reference";
import { leaveBalanceFor, leaveTypes } from "@/lib/mock";
import { tasksByAssignee } from "@/lib/mock/projects";
import {
  weeklyHoursSeries,
  totalHoursThisWeek,
  currentlyCheckedIn,
  lateEntriesThisWeek,
  pendingLeaveRequests,
  departmentHoursBreakdown,
} from "@/lib/stats";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { WeeklyHoursChart } from "@/components/charts/WeeklyHoursChart";
import { DepartmentBarChart } from "@/components/charts/DepartmentBarChart";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar, EmptyState } from "@/components/ui/Misc";
import { formatDateFull } from "@/lib/utils";

export default function DashboardPage() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const timeEntries = useAppStore((s) => s.timeEntries);
  const leaveRequests = useAppStore((s) => s.leaveRequests);
  const timer = useAppStore((s) => s.timer);
  const projects = useAppStore((s) => s.projects);
  const user = userById(currentUserId)!;
  const isManagerLike = user.role === "manager" || user.role === "hr_admin" || user.role === "admin";
  const scopeDeptId = user.role === "manager" ? user.departmentId ?? undefined : undefined;

  const weekly = weeklyHoursSeries(timeEntries, isManagerLike ? undefined : currentUserId);
  const totalHours = totalHoursThisWeek(timeEntries, isManagerLike ? undefined : currentUserId);
  const checkedIn = currentlyCheckedIn(timeEntries, scopeDeptId);
  const late = lateEntriesThisWeek(timeEntries, scopeDeptId);
  const pendingLeave = pendingLeaveRequests(leaveRequests, scopeDeptId);
  const deptBreakdown = departmentHoursBreakdown(timeEntries);
  const myBalances = leaveBalanceFor(currentUserId);
  const myTasks = tasksByAssignee(currentUserId).filter((t) => t.status !== "done");

  const todayStr = formatDateFull(new Date().toISOString());
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Доброго ранку" : hour < 18 ? "Доброго дня" : "Доброго вечора";

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">
            {greeting}, {user.fullName.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm capitalize text-ink-500">{todayStr}</p>
        </div>
        {timer.status === "idle" && (
          <Link href="/tracker">
            <Button variant="primary" size="lg" className="rounded-full">
              <Play size={16} fill="currentColor" /> Почати відлік часу
            </Button>
          </Link>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Clock} label={isManagerLike ? "Відпрацьовано підрозділом (тиждень)" : "Відпрацьовано за тиждень"} value={`${totalHours} год`} tone="brand" />
        {isManagerLike ? (
          <>
            <StatCard icon={Users} label="Зараз на роботі" value={String(checkedIn.length)} hint="активних сесій" tone="green" />
            <StatCard icon={AlertTriangle} label="Запізнення (7 днів)" value={String(late.length)} tone="amber" />
            <StatCard icon={Plane} label="Заявки на розгляд" value={String(pendingLeave.length)} tone="red" />
          </>
        ) : (
          <>
            <StatCard
              icon={Plane}
              label="Залишок відпустки"
              value={`${(myBalances.find((b) => b.leaveTypeId === 1)?.totalDays ?? 0) - (myBalances.find((b) => b.leaveTypeId === 1)?.usedDays ?? 0)} дн`}
              tone="green"
            />
            <StatCard icon={CheckCircle2} label="Активні задачі" value={String(myTasks.length)} tone="blue" />
            <StatCard icon={AlertTriangle} label="Мої запізнення (7 днів)" value={String(lateEntriesThisWeek(timeEntries).filter((l) => l.user.id === currentUserId).length)} tone="amber" />
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* left / main column */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{isManagerLike ? "Відпрацьований час підрозділу" : "Мій відпрацьований час"} · 7 днів</CardTitle>
              <Link href="/timesheet" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                Табель <ArrowUpRight size={13} />
              </Link>
            </CardHeader>
            <CardBody className="pt-2">
              <WeeklyHoursChart data={weekly} />
            </CardBody>
          </Card>

          {isManagerLike ? (
            <Card>
              <CardHeader>
                <CardTitle>Хто зараз на роботі</CardTitle>
                <Badge tone="green" dot>
                  {checkedIn.length} активних
                </Badge>
              </CardHeader>
              <CardBody className="pt-2">
                {checkedIn.length === 0 ? (
                  <EmptyState icon={Users} title="Зараз ніхто не відмічений" description="Як тільки хтось розпочне робочий день, він з'явиться тут." />
                ) : (
                  <div className="divide-y divide-ink-100">
                    {checkedIn.map(({ user: u, entry }) => (
                      <div key={entry.id} className="flex items-center gap-3 py-3">
                        <Avatar name={u.fullName} color={u.avatarColor} size={34} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-800">{u.fullName}</p>
                          <p className="text-xs text-ink-400">{departmentById(u.departmentId)?.name}</p>
                        </div>
                        <Badge tone="green" dot>
                          з {new Date(entry.checkIn).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Мої задачі</CardTitle>
                <Link href="/projects" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                  Усі проєкти <ArrowUpRight size={13} />
                </Link>
              </CardHeader>
              <CardBody className="pt-2">
                {myTasks.length === 0 ? (
                  <EmptyState icon={CheckCircle2} title="Немає активних задач" />
                ) : (
                  <div className="divide-y divide-ink-100">
                    {myTasks.slice(0, 5).map((t) => {
                      const project = projects.find((p) => p.id === t.projectId);
                      return (
                        <div key={t.id} className="flex items-center gap-3 py-3">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: project?.color }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink-800">{t.title}</p>
                            <p className="text-xs text-ink-400">{project?.name}</p>
                          </div>
                          <Badge tone={t.priority === "urgent" ? "red" : t.priority === "high" ? "amber" : t.priority === "medium" ? "blue" : "gray"}>{priorityLabel(t.priority)}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        {/* right / side column */}
        <div className="space-y-6">
          {isManagerLike && (
            <Card>
              <CardHeader>
                <CardTitle>Відпрацьовано по підрозділах</CardTitle>
              </CardHeader>
              <CardBody className="pt-2">
                <DepartmentBarChart data={deptBreakdown} />
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Заявки на відпустку</CardTitle>
              <Link href="/leave" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                Усі <ArrowUpRight size={13} />
              </Link>
            </CardHeader>
            <CardBody className="pt-2 space-y-3">
              {isManagerLike ? (
                pendingLeave.length === 0 ? (
                  <EmptyState icon={Plane} title="Немає заявок на розгляд" />
                ) : (
                  pendingLeave.slice(0, 4).map(({ request, user: u }) => (
                    <div key={request.id} className="flex items-center gap-3">
                      <Avatar name={u.fullName} color={u.avatarColor} size={30} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-ink-800">{u.fullName}</p>
                        <p className="text-[11px] text-ink-400">
                          {leaveTypes.find((lt) => lt.id === request.leaveTypeId)?.name}
                        </p>
                      </div>
                      <Badge tone="amber">Очікує</Badge>
                    </div>
                  ))
                )
              ) : (
                <>
                  {leaveTypes
                    .filter((lt) => lt.annualLimitDays)
                    .map((lt) => {
                      const b = myBalances.find((bb) => bb.leaveTypeId === lt.id);
                      if (!b) return null;
                      return (
                        <div key={lt.id}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-medium text-ink-700">{lt.name}</span>
                            <span className="text-ink-400">
                              {b.totalDays - b.usedDays} з {b.totalDays} дн
                            </span>
                          </div>
                          <ProgressBar value={b.totalDays - b.usedDays} max={b.totalDays} colorClass="bg-brand-600" />
                        </div>
                      );
                    })}
                  <Link href="/leave">
                    <Button variant="outline" size="sm" className="mt-2 w-full">
                      Подати заявку
                    </Button>
                  </Link>
                </>
              )}
            </CardBody>
          </Card>

          {isManagerLike && late.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Останні запізнення</CardTitle>
              </CardHeader>
              <CardBody className="pt-2 space-y-3">
                {late.slice(0, 4).map(({ entry, user: u, late: mins }) => (
                  <div key={entry.id} className="flex items-center gap-3">
                    <Avatar name={u.fullName} color={u.avatarColor} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink-800">{u.fullName}</p>
                      <p className="text-[11px] text-ink-400">{new Date(entry.workDate).toLocaleDateString("uk-UA")}</p>
                    </div>
                    <Badge tone="red">+{mins} хв</Badge>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function priorityLabel(p: string) {
  return p === "urgent" ? "Терміново" : p === "high" ? "Високий" : p === "medium" ? "Середній" : "Низький";
}
