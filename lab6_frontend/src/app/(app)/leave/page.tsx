"use client";

import { useMemo, useState } from "react";
import { Plane, Plus, Check, X as XIcon } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { userById, users } from "@/lib/mock/reference";
import { leaveTypes, leaveBalanceFor } from "@/lib/mock";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs } from "@/components/ui/Tabs";
import { ProgressBar, EmptyState, SectionHeading } from "@/components/ui/Misc";
import { Modal } from "@/components/ui/Modal";
import { Select, Input, Textarea, Label, FormRow } from "@/components/ui/Field";
import { formatDateShort, formatDateFull, toLocalISODate } from "@/lib/utils";
import type { LeaveStatus } from "@/lib/types";

const statusTone: Record<LeaveStatus, "amber" | "green" | "red" | "gray"> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
  cancelled: "gray",
};
const statusLabel: Record<LeaveStatus, string> = {
  pending: "Очікує",
  approved: "Затверджено",
  rejected: "Відхилено",
  cancelled: "Скасовано",
};

export default function LeavePage() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const me = userById(currentUserId)!;
  const isManagerLike = me.role === "manager" || me.role === "hr_admin" || me.role === "admin";
  const leaveRequests = useAppStore((s) => s.leaveRequests);
  const addLeaveRequest = useAppStore((s) => s.addLeaveRequest);
  const decideLeaveRequest = useAppStore((s) => s.decideLeaveRequest);

  const [tab, setTab] = useState<"mine" | "team">(isManagerLike ? "team" : "mine");
  const [formOpen, setFormOpen] = useState(false);

  const scopeIds = isManagerLike
    ? me.role === "manager"
      ? users.filter((u) => u.departmentId === me.departmentId).map((u) => u.id)
      : users.map((u) => u.id)
    : [currentUserId];

  const list = useMemo(() => {
    const ids = tab === "mine" ? [currentUserId] : scopeIds;
    return leaveRequests
      .filter((r) => ids.includes(r.userId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaveRequests, tab, currentUserId, scopeIds.join(",")]);

  const myBalances = leaveBalanceFor(currentUserId);

  return (
    <div className="mx-auto max-w-6xl">
      <SectionHeading
        title="Відпустки та лікарняні"
        subtitle="Подавайте заявки та відстежуйте їхній статус"
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus size={15} /> Нова заявка
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {isManagerLike && (
            <div className="mb-4">
              <Tabs
                value={tab}
                onChange={(v) => setTab(v as "mine" | "team")}
                items={[
                  { value: "team", label: "Команда", count: scopeIds.length },
                  { value: "mine", label: "Мої заявки" },
                ]}
              />
            </div>
          )}

          <Card>
            <CardBody className="p-0">
              {list.length === 0 ? (
                <EmptyState icon={Plane} title="Заявок немає" />
              ) : (
                <div className="divide-y divide-ink-100">
                  {list.map((r) => {
                    const u = userById(r.userId)!;
                    const lt = leaveTypes.find((l) => l.id === r.leaveTypeId)!;
                    const days = Math.round((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / 86400000) + 1;
                    return (
                      <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                        <Avatar name={u.fullName} color={u.avatarColor} size={34} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ink-800">{u.fullName}</p>
                          <p className="text-xs text-ink-400">
                            <span className="font-medium" style={{ color: lt.color }}>
                              {lt.name}
                            </span>{" "}
                            · {formatDateShort(r.startDate)}–{formatDateShort(r.endDate)} ({days} дн)
                          </p>
                          {r.reason && <p className="mt-0.5 text-xs text-ink-400">«{r.reason}»</p>}
                        </div>
                        <Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge>
                        {isManagerLike && tab === "team" && r.status === "pending" && (
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50" onClick={() => decideLeaveRequest(r.id, "approved", currentUserId)}>
                              <Check size={14} /> Затвердити
                            </Button>
                            <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => decideLeaveRequest(r.id, "rejected", currentUserId)}>
                              <XIcon size={14} /> Відхилити
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Мій баланс</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4 pt-2">
              {leaveTypes
                .filter((lt) => lt.annualLimitDays)
                .map((lt) => {
                  const b = myBalances.find((bb) => bb.leaveTypeId === lt.id);
                  if (!b) return null;
                  const remaining = b.totalDays - b.usedDays;
                  return (
                    <div key={lt.id}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-ink-700">{lt.name}</span>
                        <span className="text-ink-400">{remaining} з {b.totalDays} дн</span>
                      </div>
                      <ProgressBar value={remaining} max={b.totalDays} colorClass="bg-brand-600" />
                    </div>
                  );
                })}
              <div className="rounded-xl bg-ink-50 p-3 text-xs text-ink-500">
                Лікарняні та відрядження не мають річного ліміту — обмеження визначає лікарняний лист/наказ.
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <LeaveRequestModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={(data) => {
          addLeaveRequest({ ...data, userId: currentUserId });
          setFormOpen(false);
        }}
      />
    </div>
  );
}

function LeaveRequestModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { leaveTypeId: number; startDate: string; endDate: string; reason: string }) => void;
}) {
  const today = toLocalISODate(new Date());
  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id ?? 1);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    if (endDate < startDate) {
      setError("Дата завершення не може бути раніше дати початку");
      return;
    }
    onSubmit({ leaveTypeId, startDate, endDate, reason });
    setError("");
    setReason("");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Нова заявка на відпустку / лікарняний"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit}>Подати заявку</Button>
        </>
      }
    >
      <FormRow>
        <Label>Тип відсутності</Label>
        <Select value={leaveTypeId} onChange={(e) => setLeaveTypeId(Number(e.target.value))}>
          {leaveTypes.map((lt) => (
            <option key={lt.id} value={lt.id}>
              {lt.name}
            </option>
          ))}
        </Select>
      </FormRow>
      <div className="grid grid-cols-2 gap-3">
        <FormRow>
          <Label>Початок</Label>
          <Input type="date" value={startDate} min={today} onChange={(e) => setStartDate(e.target.value)} />
        </FormRow>
        <FormRow>
          <Label>Завершення</Label>
          <Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
        </FormRow>
      </div>
      <FormRow>
        <Label>Коментар</Label>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Коротко опишіть причину" />
      </FormRow>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-xs text-ink-400">
        Заявку буде надіслано на розгляд керівнику підрозділу. Сьогодні: {formatDateFull(new Date().toISOString())}.
      </p>
    </Modal>
  );
}
