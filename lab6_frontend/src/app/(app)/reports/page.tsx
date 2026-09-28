"use client";

import { useMemo, useState } from "react";
import { FileBarChart2, Download, Plus, Clock, TrendingUp, Users } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { userById, departments } from "@/lib/mock/reference";
import { leaveTypes } from "@/lib/mock";
import { departmentHoursBreakdown, lateEntriesThisWeek, totalHoursThisWeek } from "@/lib/stats";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Select, Input, Label, FormRow } from "@/components/ui/Field";
import { SectionHeading, EmptyState } from "@/components/ui/Misc";
import { StatCard } from "@/components/dashboard/StatCard";
import { DepartmentBarChart } from "@/components/charts/DepartmentBarChart";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { DonutChart } from "@/components/charts/DonutChart";
import type { ReportType } from "@/lib/types";
import { toLocalISODate } from "@/lib/utils";

const typeLabel: Record<ReportType, string> = {
  attendance_summary: "Зведений звіт відвідуваності",
  lateness_summary: "Звіт про запізнення",
  leave_summary: "Звіт по відпустках",
  department_summary: "Звіт по підрозділу",
  payroll_cost_summary: "Звіт по оплаті праці",
};

export default function ReportsPage() {
  const timeEntries = useAppStore((s) => s.timeEntries);
  const leaveRequests = useAppStore((s) => s.leaveRequests);
  const reports = useAppStore((s) => s.reports);
  const addReport = useAppStore((s) => s.addReport);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const [genOpen, setGenOpen] = useState(false);
  const [toast, setToast] = useState("");

  const deptBreakdown = departmentHoursBreakdown(timeEntries);
  const late = lateEntriesThisWeek(timeEntries);
  const totalHours = totalHoursThisWeek(timeEntries);

  const latenessTrend = useMemo(() => {
    const days: { label: string; late: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = toLocalISODate(d);
      const label = d.toLocaleDateString("uk-UA", { weekday: "short" });
      const sum = late.filter((l) => l.entry.workDate === iso).reduce((s, l) => s + l.late, 0);
      days.push({ label: label.charAt(0).toUpperCase() + label.slice(1).replace(".", ""), late: sum });
    }
    return days;
  }, [late]);

  const leaveByType = leaveTypes.map((lt) => ({
    name: lt.name,
    value: leaveRequests.filter((r) => r.leaveTypeId === lt.id).length,
    color: lt.color,
  })).filter((x) => x.value > 0);

  const attendanceRate = Math.round((1 - late.length / Math.max(1, timeEntries.length)) * 1000) / 10;

  return (
    <div className="mx-auto max-w-7xl">
      <SectionHeading
        title="Звіти й аналітика"
        subtitle="Огляд ключових показників за останні 7 днів"
        action={
          <Button onClick={() => setGenOpen(true)}>
            <Plus size={15} /> Сформувати звіт
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Clock} label="Відпрацьовано (тиждень)" value={`${totalHours} год`} tone="brand" />
        <StatCard icon={TrendingUp} label="Рівень присутності" value={`${attendanceRate}%`} tone="green" />
        <StatCard icon={Users} label="Випадків запізнення" value={String(late.length)} tone="amber" />
        <StatCard icon={FileBarChart2} label="Сформовано звітів" value={String(reports.length)} tone="blue" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Відпрацьовано по підрозділах</CardTitle>
          </CardHeader>
          <CardBody className="pt-2">
            <DepartmentBarChart data={deptBreakdown} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Заявки за типом</CardTitle>
          </CardHeader>
          <CardBody className="flex items-center justify-center pt-2">
            {leaveByType.length === 0 ? (
              <EmptyState icon={FileBarChart2} title="Немає даних" />
            ) : (
              <div className="flex w-full items-center gap-4">
                <DonutChart data={leaveByType} size={140} />
                <div className="space-y-1.5">
                  {leaveByType.map((x) => (
                    <div key={x.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: x.color }} />
                      <span className="text-ink-600">{x.name}</span>
                      <span className="ml-auto font-medium text-ink-800">{x.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Динаміка запізнень (хв/день)</CardTitle>
          </CardHeader>
          <CardBody className="pt-2">
            <LineTrendChart data={latenessTrend} dataKey="late" color="#EF4444" unit="хв" />
          </CardBody>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-ink-700">Історія сформованих звітів</h2>
        <Card>
          <CardBody className="p-0">
            {reports.length === 0 ? (
              <EmptyState icon={FileBarChart2} title="Звітів ще немає" />
            ) : (
              <div className="divide-y divide-ink-100">
                {reports.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <FileBarChart2 size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-800">{typeLabel[r.type]}</p>
                      <p className="text-xs text-ink-400">
                        {r.periodStart} – {r.periodEnd} · {r.departmentId ? departments.find((d) => d.id === r.departmentId)?.name : "Уся компанія"} · сформував {userById(r.generatedBy)?.fullName.split(" ")[0]}
                      </p>
                    </div>
                    <Badge tone="gray">{r.format}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setToast(`Звіт «${typeLabel[r.type]}» (${r.format}) готовий до перегляду — у демо-режимі файл не генерується.`);
                        setTimeout(() => setToast(""), 3500);
                      }}
                    >
                      <Download size={13} /> Завантажити
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-xs rounded-xl bg-ink-900 px-4 py-3 text-xs text-white shadow-pop animate-fade-in">
          {toast}
        </div>
      )}

      <GenerateReportModal
        open={genOpen}
        onClose={() => setGenOpen(false)}
        onSubmit={(data) => {
          addReport({ ...data, generatedBy: currentUserId });
          setGenOpen(false);
        }}
      />
    </div>
  );
}

function GenerateReportModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { type: ReportType; departmentId: number | null; periodStart: string; periodEnd: string; format: "PDF" | "XLSX" }) => void;
}) {
  const [type, setType] = useState<ReportType>("attendance_summary");
  const [departmentId, setDepartmentId] = useState<number | "all">("all");
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toLocalISODate(d);
  });
  const [periodEnd, setPeriodEnd] = useState(() => toLocalISODate(new Date()));
  const [format, setFormat] = useState<"PDF" | "XLSX">("PDF");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Сформувати новий звіт"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Скасувати
          </Button>
          <Button
            onClick={() =>
              onSubmit({ type, departmentId: departmentId === "all" ? null : departmentId, periodStart, periodEnd, format })
            }
          >
            Сформувати
          </Button>
        </>
      }
    >
      <FormRow>
        <Label>Тип звіту</Label>
        <Select value={type} onChange={(e) => setType(e.target.value as ReportType)}>
          {Object.entries(typeLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </FormRow>
      <FormRow>
        <Label>Підрозділ</Label>
        <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value === "all" ? "all" : Number(e.target.value))}>
          <option value="all">Уся компанія</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </FormRow>
      <div className="grid grid-cols-2 gap-3">
        <FormRow>
          <Label>Початок періоду</Label>
          <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
        </FormRow>
        <FormRow>
          <Label>Кінець періоду</Label>
          <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
        </FormRow>
      </div>
      <FormRow>
        <Label>Формат</Label>
        <Select value={format} onChange={(e) => setFormat(e.target.value as "PDF" | "XLSX")}>
          <option value="PDF">PDF</option>
          <option value="XLSX">Excel (XLSX)</option>
        </Select>
      </FormRow>
    </Modal>
  );
}
