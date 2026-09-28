"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, ChevronLeft, Calendar, FolderKanban, Users2, Pencil, Wallet, Clock } from "lucide-react";
import { userById, departmentById } from "@/lib/mock/reference";
import { useAppStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Misc";
import { Select } from "@/components/ui/Field";
import { formatDateShort, minutesToHm, cn } from "@/lib/utils";
import type { TaskStatus, TaskPriority } from "@/lib/types";
import {
  projectTimeSeries,
  projectWorkloadByMember,
  projectTaskBreakdown,
  projectPlannedVsActual,
  projectCost,
} from "@/lib/stats";
import { canEditProject, canChangeTaskPriority, canViewFinancials } from "@/lib/permissions";
import { ProjectTimeChart } from "@/components/charts/ProjectTimeChart";
import { WorkloadBarChart } from "@/components/charts/WorkloadBarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { PlannedVsActualChart } from "@/components/charts/PlannedVsActualChart";
import { ProjectEditModal } from "@/components/modals/ProjectEditModal";

const columns: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "До виконання" },
  { key: "in_progress", label: "У процесі" },
  { key: "done", label: "Завершено" },
];

const priorityTone: Record<TaskPriority, "red" | "amber" | "blue" | "gray"> = {
  urgent: "red",
  high: "amber",
  medium: "blue",
  low: "gray",
};
const priorityLabel: Record<TaskPriority, string> = {
  urgent: "Терміново",
  high: "Високий",
  medium: "Середній",
  low: "Низький",
};

const statusTone = { active: "green", on_hold: "amber", completed: "gray", planning: "blue" } as const;
const statusLabel = { active: "Активний", on_hold: "На паузі", completed: "Завершено", planning: "Планування" } as const;

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const projectId = Number(params.id);
  const projects = useAppStore((s) => s.projects);
  const project = projects.find((p) => p.id === projectId);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const me = userById(currentUserId)!;
  const tasks = useAppStore((s) => s.tasks).filter((t) => t.projectId === projectId);
  const timeEntries = useAppStore((s) => s.timeEntries);
  const hourlyRates = useAppStore((s) => s.hourlyRates);
  const setTaskStatus = useAppStore((s) => s.setTaskStatus);
  const setTaskPriority = useAppStore((s) => s.setTaskPriority);
  const [editOpen, setEditOpen] = useState(false);

  if (!project) return notFound();

  const canEdit = canEditProject(me, project);
  const canPriority = canChangeTaskPriority(me);

  const timeSeries = useMemo(() => projectTimeSeries(timeEntries, projectId, 14), [timeEntries, projectId]);
  const workload = useMemo(() => projectWorkloadByMember(timeEntries, projectId, project.memberIds), [timeEntries, projectId, project.memberIds]);
  const taskBreakdown = projectTaskBreakdown(tasks, projectId);
  const plannedVsActual = projectPlannedVsActual(timeEntries, tasks, projectId);
  const cost = projectCost(timeEntries, projectId, hourlyRates);
  const canViewCost = canViewFinancials(me);

  function move(taskId: number, dir: 1 | -1) {
    const idx = columns.findIndex((c) => c.key === tasks.find((t) => t.id === taskId)?.status);
    const next = columns[idx + dir];
    if (next) setTaskStatus(taskId, next.key);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft size={14} /> Усі проєкти
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: project.color }}>
          <FolderKanban size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-ink-900">{project.name}</h1>
          <p className="text-sm text-ink-500">
            {project.clientName} · {departmentById(project.departmentId)?.name}
          </p>
        </div>
        <Badge tone={statusTone[project.status]}>{statusLabel[project.status]}</Badge>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil size={14} /> Редагувати
          </Button>
        )}
      </div>

      {project.description && <p className="mb-6 max-w-3xl text-sm text-ink-500">{project.description}</p>}

      {/* --- Ключові показники проєкту --- */}
      <div className={cn("mb-6 grid grid-cols-2 gap-4", canViewCost ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
        <MetricCard icon={FolderKanban} label="Прогрес задач" value={`${taskBreakdown.done}/${taskBreakdown.total}`} hint="завершено" />
        <MetricCard icon={Clock} label="Факт / план годин" value={`${plannedVsActual.actualHours}/${plannedVsActual.plannedHours}`} hint="год" />
        {canViewCost && <MetricCard icon={Wallet} label="Собівартість" value={`${cost.toLocaleString("uk-UA")} ₴`} hint="за весь час" />}
        <MetricCard icon={Users2} label="Учасники" value={String(project.memberIds.length)} hint={`лід: ${userById(project.leadId)?.fullName.split(" ")[0] ?? "—"}`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* --- Kanban --- */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {columns.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.key);
              return (
                <div key={col.key}>
                  <div className="mb-3 flex items-center justify-between px-1">
                    <h3 className="text-sm font-semibold text-ink-700">{col.label}</h3>
                    <Badge tone="gray">{colTasks.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {colTasks.map((t) => {
                      const assignee = userById(t.assigneeId);
                      return (
                        <Card key={t.id} className="p-4">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            {canPriority ? (
                              <Select
                                value={t.priority}
                                onChange={(e) => setTaskPriority(t.id, e.target.value as TaskPriority)}
                                className={cn(
                                  "h-7 w-auto rounded-full border-0 px-2.5 py-0 text-xs font-medium",
                                  t.priority === "urgent" && "bg-red-50 text-red-700",
                                  t.priority === "high" && "bg-amber-50 text-amber-700",
                                  t.priority === "medium" && "bg-sky-50 text-sky-700",
                                  t.priority === "low" && "bg-ink-100 text-ink-600"
                                )}
                              >
                                <option value="urgent">Терміново</option>
                                <option value="high">Високий</option>
                                <option value="medium">Середній</option>
                                <option value="low">Низький</option>
                              </Select>
                            ) : (
                              <Badge tone={priorityTone[t.priority]}>{priorityLabel[t.priority]}</Badge>
                            )}
                            <div className="flex gap-0.5">
                              {col.key !== "todo" && (
                                <button onClick={() => move(t.id, -1)} className="rounded p-1 text-ink-300 hover:bg-ink-100 hover:text-ink-600">
                                  <ChevronLeft size={14} />
                                </button>
                              )}
                              {col.key !== "done" && (
                                <button onClick={() => move(t.id, 1)} className="rounded p-1 text-ink-300 hover:bg-ink-100 hover:text-ink-600">
                                  <ChevronRight size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm font-medium text-ink-800">{t.title}</p>
                          <div className="mt-3 flex items-center justify-between">
                            {assignee && <Avatar name={assignee.fullName} color={assignee.avatarColor} size={24} />}
                            <div className="flex items-center gap-2 text-[11px] text-ink-400">
                              {t.estimateMinutes && <span>{minutesToHm(t.estimateMinutes)}</span>}
                              {t.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar size={11} /> {formatDateShort(t.dueDate)}
                                </span>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                    {colTasks.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-ink-200 py-8 text-center text-xs text-ink-300">Немає задач</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- Учасники --- */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Учасники проєкту</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 pt-2">
              {project.memberIds.map((id) => {
                const u = userById(id);
                if (!u) return null;
                const isLead = id === project.leadId;
                return (
                  <div key={id} className="flex items-center gap-3">
                    <Avatar name={u.fullName} color={u.avatarColor} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink-800">{u.fullName}</p>
                      <p className="text-[11px] text-ink-400">{departmentById(u.departmentId)?.name}</p>
                    </div>
                    {isLead && <Badge tone="brand">Лід</Badge>}
                  </div>
                );
              })}
              {project.memberIds.length === 0 && <p className="text-xs text-ink-400">Учасників ще не призначено.</p>}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* --- Аналітика проєкту --- */}
      <h2 className="mb-4 mt-8 text-base font-semibold text-ink-800">Аналітика проєкту</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Динаміка витраченого часу (14 днів)</CardTitle>
          </CardHeader>
          <CardBody className="pt-2">
            <ProjectTimeChart data={timeSeries} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Навантаження учасників</CardTitle>
          </CardHeader>
          <CardBody className="pt-2">
            {workload.every((w) => w.hours === 0) ? (
              <p className="py-8 text-center text-xs text-ink-400">Ще немає відпрацьованого часу по проєкту.</p>
            ) : (
              <WorkloadBarChart data={workload} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Виконання задач</CardTitle>
          </CardHeader>
          <CardBody className="flex items-center gap-6 pt-2">
            <DonutChart
              data={[
                { name: "Завершено", value: taskBreakdown.done, color: "#10B981" },
                { name: "У процесі", value: taskBreakdown.inProgress, color: "#0EA5E9" },
                { name: "До виконання", value: taskBreakdown.todo, color: "#D1D1DC" },
              ]}
            />
            <div className="space-y-2 text-xs">
              <LegendRow color="#10B981" label="Завершено" value={taskBreakdown.done} />
              <LegendRow color="#0EA5E9" label="У процесі" value={taskBreakdown.inProgress} />
              <LegendRow color="#D1D1DC" label="До виконання" value={taskBreakdown.todo} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Планові й фактичні години</CardTitle>
          </CardHeader>
          <CardBody className="pt-2">
            <PlannedVsActualChart planned={plannedVsActual.plannedHours} actual={plannedVsActual.actualHours} />
            <div className="mt-2">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-ink-500">Використано бюджету годин</span>
                <span className="text-ink-400">
                  {plannedVsActual.actualHours}/{project.budgetHours} год
                </span>
              </div>
              <ProgressBar value={plannedVsActual.actualHours} max={project.budgetHours} colorClass="bg-brand-600" />
            </div>
          </CardBody>
        </Card>
      </div>

      {canEdit && (
        <ProjectEditModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          project={project}
        />
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, hint }: { icon: typeof FolderKanban; label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon size={16} />
      </div>
      <p className="text-lg font-bold text-ink-900">{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
      {hint && <p className="text-[11px] text-ink-400">{hint}</p>}
    </Card>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-ink-600">{label}</span>
      <span className="font-semibold text-ink-800">{value}</span>
    </div>
  );
}
