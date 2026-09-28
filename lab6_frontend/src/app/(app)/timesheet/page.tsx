"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2, Plus, Filter, Download } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { userById, departmentById, users } from "@/lib/mock/reference";
import { workedMinutes, lateMinutes } from "@/lib/stats";
import { minutesToHm, formatTime, formatDateShort, formatWeekday, cn, toLocalISODate } from "@/lib/utils";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, Input, Label } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { SectionHeading, EmptyState } from "@/components/ui/Misc";
import { TimeEntryFormModal } from "@/components/modals/TimeEntryFormModal";
import type { TimeEntry, TimeEntryStatus } from "@/lib/types";
import { canManageTimeEntryFor, canCreateAnyManualEntry } from "@/lib/permissions";

const PAGE_SIZE = 10;

function statusBadge(status: TimeEntryStatus) {
  switch (status) {
    case "completed":
      return <Badge tone="green">Завершено</Badge>;
    case "in_progress":
      return (
        <Badge tone="blue" dot>
          Триває
        </Badge>
      );
    case "edited":
      return <Badge tone="amber">Відкориговано</Badge>;
    case "missing_checkout":
      return <Badge tone="red">Без відходу</Badge>;
  }
}

export default function TimesheetPage() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const timeEntries = useAppStore((s) => s.timeEntries);
  const projects = useAppStore((s) => s.projects);
  const updateTimeEntry = useAppStore((s) => s.updateTimeEntry);
  const deleteTimeEntry = useAppStore((s) => s.deleteTimeEntry);
  const addManualTimeEntry = useAppStore((s) => s.addManualTimeEntry);
  const me = userById(currentUserId)!;
  const isManagerLike = me.role === "manager" || me.role === "hr_admin" || me.role === "admin";
  const canAdd = canCreateAnyManualEntry(me, projects);

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 13);
    return toLocalISODate(d);
  });
  const [to, setTo] = useState(() => toLocalISODate(new Date()));
  const [userFilter, setUserFilter] = useState<number | "all">(isManagerLike ? "all" : currentUserId);
  const [statusFilter, setStatusFilter] = useState<TimeEntryStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TimeEntry | null>(null);

  const scopeUserIds = isManagerLike
    ? me.role === "manager"
      ? users.filter((u) => u.departmentId === me.departmentId).map((u) => u.id)
      : users.map((u) => u.id)
    : [currentUserId];

  const filtered = useMemo(() => {
    return timeEntries
      .filter((e) => scopeUserIds.includes(e.userId))
      .filter((e) => e.workDate >= from && e.workDate <= to)
      .filter((e) => (userFilter === "all" ? true : e.userId === userFilter))
      .filter((e) => (statusFilter === "all" ? true : e.status === statusFilter))
      .sort((a, b) => b.workDate.localeCompare(a.workDate) || b.checkIn.localeCompare(a.checkIn));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeEntries, from, to, userFilter, statusFilter, scopeUserIds.join(",")]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalMinutes = filtered.reduce((s, e) => s + workedMinutes(e), 0);

  return (
    <div className="mx-auto max-w-6xl">
      <SectionHeading
        title="Табель"
        subtitle={`${filtered.length} записів · разом ${minutesToHm(totalMinutes)}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download size={14} /> Експорт
            </Button>
            {canAdd && (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus size={14} /> Додати запис
              </Button>
            )}
          </div>
        }
      />

      <Card className="mb-4">
        <CardBody className="flex flex-wrap items-end gap-3 py-4">
          <Filter size={16} className="mb-2.5 text-ink-400" />
          <div>
            <Label>З дати</Label>
            <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-36" />
          </div>
          <div>
            <Label>По дату</Label>
            <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="w-36" />
          </div>
          {isManagerLike && (
            <div>
              <Label>Працівник</Label>
              <Select value={userFilter} onChange={(e) => { setUserFilter(e.target.value === "all" ? "all" : Number(e.target.value)); setPage(1); }} className="w-52">
                <option value="all">Усі працівники</option>
                {users
                  .filter((u) => scopeUserIds.includes(u.id))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName}
                    </option>
                  ))}
              </Select>
            </div>
          )}
          <div>
            <Label>Статус</Label>
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as TimeEntryStatus | "all"); setPage(1); }} className="w-44">
              <option value="all">Усі статуси</option>
              <option value="completed">Завершено</option>
              <option value="edited">Відкориговано</option>
              <option value="missing_checkout">Без відходу</option>
              <option value="in_progress">Триває</option>
            </Select>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          {pageItems.length === 0 ? (
            <EmptyState icon={Filter} title="Записів не знайдено" description="Спробуйте змінити період або фільтри." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-400">
                    <th className="px-5 py-3">Дата</th>
                    {isManagerLike && <th className="px-3 py-3">Працівник</th>}
                    <th className="px-3 py-3">Прихід</th>
                    <th className="px-3 py-3">Відхід</th>
                    <th className="px-3 py-3">Тривалість</th>
                    <th className="px-3 py-3">Проєкт</th>
                    <th className="px-3 py-3">Запізнення</th>
                    <th className="px-3 py-3">Статус</th>
                    <th className="px-5 py-3 text-right">Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((e) => {
                    const u = userById(e.userId)!;
                    const project = projects.find((p) => p.id === e.projectId);
                    const late = lateMinutes(e);
                    return (
                      <tr key={e.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60">
                        <td className="px-5 py-3">
                          <p className="font-medium text-ink-800">{formatDateShort(e.workDate)}</p>
                          <p className="text-xs capitalize text-ink-400">{formatWeekday(e.workDate)}</p>
                        </td>
                        {isManagerLike && (
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar name={u.fullName} color={u.avatarColor} size={24} />
                              <span className="whitespace-nowrap text-xs font-medium text-ink-700">{u.fullName}</span>
                            </div>
                          </td>
                        )}
                        <td className="px-3 py-3 tabular-nums">{formatTime(e.checkIn)}</td>
                        <td className="px-3 py-3 tabular-nums">{e.checkOut ? formatTime(e.checkOut) : "—"}</td>
                        <td className="px-3 py-3 font-medium tabular-nums text-ink-700">{minutesToHm(workedMinutes(e))}</td>
                        <td className="px-3 py-3">
                          {project ? (
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                              {project.name}
                            </span>
                          ) : (
                            <span className="text-ink-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {late > 0 ? <Badge tone="red">+{late} хв</Badge> : <span className="text-ink-300">—</span>}
                        </td>
                        <td className="px-3 py-3">{statusBadge(e.status)}</td>
                        <td className="px-5 py-3">
                          {canManageTimeEntryFor(me, e.projectId, projects) ? (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => setEditing(e)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => setDeleteTarget(e)} className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="block text-right text-ink-200">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-ink-500">
          <span>
            Сторінка {page} з {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Назад
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              Далі
            </Button>
          </div>
        </div>
      )}

      <TimeEntryFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Додати запис часу"
        onSubmit={(data) => {
          addManualTimeEntry(
            { ...data, userId: currentUserId, status: "completed", taskId: null, note: data.note || undefined },
            currentUserId
          );
          setAddOpen(false);
        }}
      />

      <TimeEntryFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        initial={editing}
        title="Редагувати запис часу"
        onSubmit={(data) => {
          if (editing) {
            updateTimeEntry(editing.id, { ...data, status: "edited", note: data.note || undefined });
          }
          setEditing(null);
        }}
      />

      {deleteTarget && (
        <ConfirmDeleteModal
          entry={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteTimeEntry(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

function ConfirmDeleteModal({ entry, onCancel, onConfirm }: { entry: TimeEntry; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-pop animate-fade-in">
        <h3 className="text-base font-semibold text-ink-800">Видалити запис?</h3>
        <p className="mt-2 text-sm text-ink-500">
          Запис за {formatDateShort(entry.workDate)} ({formatTime(entry.checkIn)}
          {entry.checkOut ? ` – ${formatTime(entry.checkOut)}` : ""}) буде видалено без можливості відновлення.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Скасувати
          </Button>
          <Button variant="danger" className={cn("bg-red-600 text-white hover:bg-red-700")} onClick={onConfirm}>
            Видалити
          </Button>
        </div>
      </div>
    </div>
  );
}
