"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderKanban, Users2, Plus } from "lucide-react";
import { userById, departmentById } from "@/lib/mock/reference";
import { useAppStore } from "@/lib/store";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/Misc";
import { SectionHeading } from "@/components/ui/Misc";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ProjectEditModal } from "@/components/modals/ProjectEditModal";
import { canManageProjects } from "@/lib/permissions";
import { projectPlannedVsActual } from "@/lib/stats";

const statusTone = { active: "green", on_hold: "amber", completed: "gray", planning: "blue" } as const;
const statusLabel = { active: "Активний", on_hold: "На паузі", completed: "Завершено", planning: "Планування" } as const;

export default function ProjectsPage() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const me = userById(currentUserId)!;
  const projects = useAppStore((s) => s.projects);
  const tasks = useAppStore((s) => s.tasks);
  const timeEntries = useAppStore((s) => s.timeEntries);
  const [createOpen, setCreateOpen] = useState(false);
  const canCreate = canManageProjects(me);

  return (
    <div className="mx-auto max-w-6xl">
      <SectionHeading
        title="Проєкти"
        subtitle={`${projects.length} проєктів · облік часу ведеться по кожному`}
        action={
          canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> Новий проєкт
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => {
          const projectTasks = tasks.filter((t) => t.projectId === p.id);
          const done = projectTasks.filter((t) => t.status === "done").length;
          const { actualHours: usedHours } = projectPlannedVsActual(timeEntries, projectTasks, p.id);
          const members = p.memberIds.slice(0, 4).map((id) => userById(id)).filter(Boolean) as NonNullable<ReturnType<typeof userById>>[];

          return (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="h-full p-5 transition-shadow hover:shadow-pop">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ backgroundColor: p.color }}>
                    <FolderKanban size={18} />
                  </div>
                  <Badge tone={statusTone[p.status]}>{statusLabel[p.status]}</Badge>
                </div>
                <h3 className="font-semibold text-ink-900">{p.name}</h3>
                <p className="mt-0.5 text-xs text-ink-400">{p.clientName}</p>
                <p className="mt-1 text-[11px] text-ink-400">{departmentById(p.departmentId)?.name}</p>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-ink-500">
                      {done}/{projectTasks.length} задач
                    </span>
                    <span className="text-ink-400">{p.budgetHours} год бюджет</span>
                  </div>
                  <ProgressBar value={usedHours} max={p.budgetHours} colorClass="bg-brand-600" />
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {members.map((u) => (
                      <Avatar key={u.id} name={u.fullName} color={u.avatarColor} size={26} />
                    ))}
                    {members.length === 0 && <span className="text-xs text-ink-300">Немає учасників</span>}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-ink-400">
                    <Users2 size={13} /> {p.memberIds.length}
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {canCreate && <ProjectEditModal open={createOpen} onClose={() => setCreateOpen(false)} />}
    </div>
  );
}
