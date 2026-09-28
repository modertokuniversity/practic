"use client";

import { useMemo, useState } from "react";
import { Play, Square, Pause, Coffee, Clock, ListPlus } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useTicker } from "@/lib/useTicker";
import { secondsToClock, minutesToHm, formatTime, toLocalISODate } from "@/lib/utils";
import { tasksByProject } from "@/lib/mock/projects";
import { userById } from "@/lib/mock/reference";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, Input, Label, FormRow } from "@/components/ui/Field";
import { SectionHeading, EmptyState } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";
import { TimeEntryFormModal } from "@/components/modals/TimeEntryFormModal";
import { workedMinutes } from "@/lib/stats";
import { summarizeSegments } from "@/lib/timer";
import { canCreateAnyManualEntry } from "@/lib/permissions";

const STATUS_LABEL: Record<string, string> = {
  idle: "Таймер зупинено",
  work: "Робочий час",
  pause: "На паузі",
  lunch: "Обідня перерва",
};

export default function TrackerPage() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const user = userById(currentUserId);
  const projects = useAppStore((s) => s.projects);
  const timer = useAppStore((s) => s.timer);
  const startTimer = useAppStore((s) => s.startTimer);
  const pauseTimer = useAppStore((s) => s.pauseTimer);
  const resumeTimer = useAppStore((s) => s.resumeTimer);
  const startLunch = useAppStore((s) => s.startLunch);
  const endLunch = useAppStore((s) => s.endLunch);
  const stopTimer = useAppStore((s) => s.stopTimer);
  const timeEntries = useAppStore((s) => s.timeEntries);
  const addManualTimeEntry = useAppStore((s) => s.addManualTimeEntry);
  useTicker(timer.status !== "idle");

  const [projectId, setProjectId] = useState<number | "">(projects[0]?.id ?? "");
  const [taskId, setTaskId] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [manualOpen, setManualOpen] = useState(false);

  const availableTasks = projectId ? tasksByProject(Number(projectId)) : [];

  const totals = useMemo(() => summarizeSegments(timer.segments), [timer.segments, timer.status]);
  const elapsedSec = Math.floor((totals.workMs + totals.pauseMs + totals.lunchMs) / 1000);

  const canManual = user ? canCreateAnyManualEntry(user, projects) : false;

  const todayIso = toLocalISODate(new Date());
  const todaysEntries = useMemo(
    () =>
      timeEntries
        .filter((e) => e.userId === currentUserId && e.workDate === todayIso)
        .sort((a, b) => b.checkIn.localeCompare(a.checkIn)),
    [timeEntries, currentUserId, todayIso]
  );
  const todayTotalMin = todaysEntries.reduce((s, e) => s + workedMinutes(e), 0) + totals.workMs / 60000;

  const isIdle = timer.status === "idle";
  const isWork = timer.status === "work";
  const isPause = timer.status === "pause";
  const isLunch = timer.status === "lunch";

  return (
    <div className="mx-auto max-w-5xl">
      <SectionHeading title="Таймер" subtitle="Відстежуйте робочий час, паузи та обід у реальному часі, або додайте запис вручну" />

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-10 text-center text-white sm:px-10">
          <p className="text-xs font-medium uppercase tracking-widest text-brand-200">{STATUS_LABEL[timer.status]}</p>
          <p className="my-4 font-mono text-6xl font-bold tabular-nums tracking-tight sm:text-7xl">
            {secondsToClock(elapsedSec)}
          </p>

          {/* Розбивка робота / пауза / обід — окремо, як вимагає лаб. робота №6-7 */}
          {!isIdle && (
            <div className="mx-auto mb-6 flex max-w-sm items-center justify-center gap-4 text-xs text-brand-100">
              <span>Робота: <b className="text-white">{secondsToClock(Math.floor(totals.workMs / 1000))}</b></span>
              <span>Пауза: <b className="text-white">{secondsToClock(Math.floor(totals.pauseMs / 1000))}</b></span>
              <span>Обід: <b className="text-white">{secondsToClock(Math.floor(totals.lunchMs / 1000))}</b></span>
            </div>
          )}

          {isIdle && (
            <Button
              size="lg"
              className="rounded-full bg-white text-brand-700 hover:bg-brand-50"
              disabled={!projectId}
              onClick={() => startTimer(projectId ? Number(projectId) : null, taskId ? Number(taskId) : null, note)}
            >
              <Play size={16} fill="currentColor" /> Розпочати
            </Button>
          )}

          {!isIdle && (
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {isWork && (
                <Button size="lg" variant="secondary" className="rounded-full bg-white/15 text-white hover:bg-white/25" onClick={pauseTimer}>
                  <Pause size={16} fill="currentColor" /> Пауза
                </Button>
              )}
              {isPause && (
                <Button size="lg" variant="secondary" className="rounded-full bg-white/15 text-white hover:bg-white/25" onClick={resumeTimer}>
                  <Play size={16} fill="currentColor" /> Продовжити
                </Button>
              )}
              {isLunch ? (
                <Button size="lg" variant="secondary" className="rounded-full bg-white/15 text-white hover:bg-white/25" onClick={endLunch}>
                  <Coffee size={16} /> Завершити обід
                </Button>
              ) : (
                <Button size="lg" variant="secondary" className="rounded-full bg-white/15 text-white hover:bg-white/25" onClick={startLunch}>
                  <Coffee size={16} /> Почати обід
                </Button>
              )}
              <Button size="lg" variant="secondary" className="rounded-full bg-white text-brand-700 hover:bg-brand-50" onClick={stopTimer}>
                <Square size={16} fill="currentColor" /> Завершити
              </Button>
            </div>
          )}
        </div>

        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormRow>
            <Label>Проєкт</Label>
            <Select
              value={projectId}
              disabled={!isIdle}
              onChange={(e) => {
                setProjectId(e.target.value ? Number(e.target.value) : "");
                setTaskId("");
              }}
            >
              {projects
                .filter((p) => p.status !== "completed")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </Select>
          </FormRow>
          <FormRow>
            <Label>Задача (необов&apos;язково)</Label>
            <Select value={taskId} disabled={!isIdle} onChange={(e) => setTaskId(e.target.value ? Number(e.target.value) : "")}>
              <option value="">— Без задачі —</option>
              {availableTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow>
            <Label>Нотатка</Label>
            <Input value={note} disabled={!isIdle} onChange={(e) => setNote(e.target.value)} placeholder="Над чим працюєте?" />
          </FormRow>
        </CardBody>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-700">
          Сьогодні · <span className="text-ink-400 font-normal">{minutesToHm(todayTotalMin)}</span>
        </h2>
        {canManual && (
          <Button variant="outline" size="sm" onClick={() => setManualOpen(true)}>
            <ListPlus size={15} /> Додати запис вручну
          </Button>
        )}
      </div>

      <Card className="mt-3">
        <CardBody className="p-0">
          {todaysEntries.length === 0 ? (
            <EmptyState icon={Clock} title="Сьогодні ще немає записів" description="Розпочніть таймер вище або додайте запис вручну." />
          ) : (
            <div className="divide-y divide-ink-100">
              {todaysEntries.map((e) => {
                const project = projects.find((p) => p.id === e.projectId);
                return (
                  <div key={e.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: project?.color ?? "#D1D1DC" }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-800">{project?.name ?? "Без проєкту"}</p>
                      <p className="text-xs text-ink-400">
                        {e.note || "—"}
                        {(e.pauseMinutes || e.lunchMinutes) && (
                          <span className="ml-1.5 text-ink-300">
                            {e.pauseMinutes ? `· пауза ${minutesToHm(e.pauseMinutes)}` : ""}
                            {e.lunchMinutes ? ` · обід ${minutesToHm(e.lunchMinutes)}` : ""}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-ink-800">
                        {formatTime(e.checkIn)} – {e.checkOut ? formatTime(e.checkOut) : "…"}
                      </p>
                      <p className="text-xs text-ink-400">{minutesToHm(workedMinutes(e))}</p>
                    </div>
                    {e.status === "in_progress" && (
                      <Badge tone="green" dot>
                        Триває
                      </Badge>
                    )}
                    {e.source === "manual" && <Badge tone="amber">Вручну</Badge>}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <TimeEntryFormModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title="Додати запис часу вручну"
        onSubmit={(data) => {
          addManualTimeEntry(
            { ...data, userId: currentUserId, status: "completed", taskId: null, note: data.note || undefined },
            currentUserId
          );
          setManualOpen(false);
        }}
      />
    </div>
  );
}
