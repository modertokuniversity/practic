"use client";

import { useMemo, useState } from "react";
import { Wallet, Users, Clock, TrendingUp, FileBarChart2, ShieldAlert, Printer } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { userById, departments } from "@/lib/mock/reference";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select, Input, Label } from "@/components/ui/Field";
import { SectionHeading, EmptyState } from "@/components/ui/Misc";
import { StatCard } from "@/components/dashboard/StatCard";
import { Tabs } from "@/components/ui/Tabs";
import { Avatar } from "@/components/ui/Avatar";
import { toLocalISODate, formatDateFull, minutesToHm } from "@/lib/utils";
import { payrollRows, payrollByProject } from "@/lib/stats";
import { canViewPayroll } from "@/lib/permissions";

export default function PayrollPage() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const me = userById(currentUserId)!;
  const timeEntries = useAppStore((s) => s.timeEntries);
  const projects = useAppStore((s) => s.projects);
  const hourlyRates = useAppStore((s) => s.hourlyRates);
  const addReport = useAppStore((s) => s.addReport);
  const reports = useAppStore((s) => s.reports).filter((r) => r.type === "payroll_cost_summary");

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return toLocalISODate(d);
  });
  const [to, setTo] = useState(() => toLocalISODate(new Date()));
  const [departmentId, setDepartmentId] = useState<number | "all">(me.role === "manager" ? me.departmentId ?? "all" : "all");
  const [projectId, setProjectId] = useState<number | "all">("all");
  const [groupBy, setGroupBy] = useState<"employee" | "project">("employee");
  const [generated, setGenerated] = useState(false);

  if (!canViewPayroll(me)) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <ShieldAlert className="mx-auto mb-3 text-ink-300" size={36} />
        <h2 className="text-base font-semibold text-ink-700">Доступ обмежено</h2>
        <p className="mt-1 text-sm text-ink-400">Розділ «Оплата праці» доступний бухгалтеру, керівникам та адміністратору.</p>
      </div>
    );
  }

  const filters = {
    from,
    to,
    departmentId: departmentId === "all" ? null : departmentId,
    projectId: projectId === "all" ? null : projectId,
  };

  const byEmployee = useMemo(() => payrollRows(timeEntries, filters, hourlyRates), [timeEntries, from, to, departmentId, projectId, hourlyRates]);
  const byProject = useMemo(
    () => payrollByProject(timeEntries, projects, { from, to, departmentId: filters.departmentId }, hourlyRates),
    [timeEntries, projects, from, to, departmentId, hourlyRates]
  );

  const totalHours = byEmployee.reduce((s, r) => s + r.hours, 0);
  const totalCost = byEmployee.reduce((s, r) => s + r.cost, 0);
  const avgRate = totalHours > 0 ? Math.round(totalCost / totalHours) : 0;

  function handleGenerate() {
    addReport({
      type: "payroll_cost_summary",
      departmentId: filters.departmentId,
      periodStart: from,
      periodEnd: to,
      format: "PDF",
      generatedBy: currentUserId,
    });
    setGenerated(true);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <SectionHeading
        title="Оплата праці"
        subtitle="Звіт по відпрацьованих годинах, проєктах і вартості роботи за обраний період"
      />

      {/* --- Фільтри --- */}
      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-end gap-3 py-4">
          <div>
            <Label>З дати</Label>
            <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setGenerated(false); }} className="w-36" />
          </div>
          <div>
            <Label>По дату</Label>
            <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setGenerated(false); }} className="w-36" />
          </div>
          <div>
            <Label>Підрозділ</Label>
            <Select
              className="w-52"
              value={departmentId}
              onChange={(e) => { setDepartmentId(e.target.value === "all" ? "all" : Number(e.target.value)); setGenerated(false); }}
            >
              <option value="all">Усі підрозділи</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Проєкт</Label>
            <Select className="w-52" value={projectId} onChange={(e) => { setProjectId(e.target.value === "all" ? "all" : Number(e.target.value)); setGenerated(false); }}>
              <option value="all">Усі проєкти</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="ml-auto">
            <Button onClick={handleGenerate}>
              <FileBarChart2 size={15} /> Сформувати звіт
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* --- Підсумки (превʼю до формування) --- */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Clock} label="Відпрацьовано годин" value={`${Math.round(totalHours * 10) / 10} год`} tone="brand" />
        <StatCard icon={Wallet} label="Загальна вартість" value={`${totalCost.toLocaleString("uk-UA")} ₴`} tone="green" />
        <StatCard icon={TrendingUp} label="Середня ставка" value={`${avgRate} ₴/год`} tone="amber" />
        <StatCard icon={Users} label="Працівників у звіті" value={String(byEmployee.length)} tone="blue" />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <Tabs
          value={groupBy}
          onChange={(v) => setGroupBy(v as "employee" | "project")}
          items={[
            { value: "employee", label: "За працівниками", count: byEmployee.length },
            { value: "project", label: "За проєктами", count: byProject.length },
          ]}
        />
        {generated && (
          <Badge tone="green" dot>
            Звіт сформовано
          </Badge>
        )}
      </div>

      {/* --- Таблиця перегляду --- */}
      <Card className={generated ? "border-2 border-brand-200" : undefined}>
        {generated && (
          <div className="border-b border-ink-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-ink-900">Звіт: Оплата праці</h3>
                <p className="text-xs text-ink-500">
                  Період {formatDateFull(from)} – {formatDateFull(to)} ·{" "}
                  {filters.departmentId ? departments.find((d) => d.id === filters.departmentId)?.name : "Уся компанія"}
                  {filters.projectId ? ` · ${projects.find((p) => p.id === filters.projectId)?.name}` : ""}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-400">Сформував: {me.fullName} · {formatDateFull(toLocalISODate(new Date()))}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer size={13} /> Друк / PDF
              </Button>
            </div>
          </div>
        )}
        <CardBody className="p-0">
          {groupBy === "employee" ? (
            byEmployee.length === 0 ? (
              <EmptyState icon={Wallet} title="Немає даних за обраними фільтрами" description="Спробуйте розширити період або змінити підрозділ." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-400">
                      <th className="px-5 py-3">Працівник</th>
                      <th className="px-3 py-3">Годин</th>
                      <th className="px-3 py-3">Ставка</th>
                      <th className="px-5 py-3 text-right">Сума</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byEmployee.map((r) => (
                      <tr key={r.user.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={r.user.fullName} color={r.user.avatarColor} size={28} />
                            <span className="font-medium text-ink-800">{r.user.fullName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 tabular-nums text-ink-600">{minutesToHm(r.minutes)}</td>
                        <td className="px-3 py-3 tabular-nums text-ink-600">{r.hourlyRate} ₴/год</td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums text-ink-900">{r.cost.toLocaleString("uk-UA")} ₴</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-ink-200 bg-ink-50/60 font-semibold">
                      <td className="px-5 py-3 text-ink-700">Разом</td>
                      <td className="px-3 py-3 tabular-nums text-ink-700">{minutesToHm(byEmployee.reduce((s, r) => s + r.minutes, 0))}</td>
                      <td className="px-3 py-3" />
                      <td className="px-5 py-3 text-right tabular-nums text-ink-900">{totalCost.toLocaleString("uk-UA")} ₴</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )
          ) : byProject.length === 0 ? (
            <EmptyState icon={Wallet} title="Немає даних за обраними фільтрами" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-400">
                    <th className="px-5 py-3">Проєкт</th>
                    <th className="px-3 py-3">Клієнт</th>
                    <th className="px-3 py-3">Годин</th>
                    <th className="px-5 py-3 text-right">Вартість</th>
                  </tr>
                </thead>
                <tbody>
                  {byProject.map((r) => (
                    <tr key={r.project.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.project.color }} />
                          <span className="font-medium text-ink-800">{r.project.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-ink-500">{r.project.clientName}</td>
                      <td className="px-3 py-3 tabular-nums text-ink-600">{r.hours} год</td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums text-ink-900">{r.cost.toLocaleString("uk-UA")} ₴</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-ink-200 bg-ink-50/60 font-semibold">
                    <td className="px-5 py-3 text-ink-700">Разом</td>
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3 tabular-nums text-ink-700">{byProject.reduce((s, r) => s + r.hours, 0)} год</td>
                    <td className="px-5 py-3 text-right tabular-nums text-ink-900">{byProject.reduce((s, r) => s + r.cost, 0).toLocaleString("uk-UA")} ₴</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* --- Історія сформованих звітів по оплаті праці --- */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-ink-700">Історія звітів «Оплата праці»</h2>
        <Card>
          <CardBody className="p-0">
            {reports.length === 0 ? (
              <EmptyState icon={FileBarChart2} title="Звітів ще немає" description="Сформуйте перший звіт вище." />
            ) : (
              <div className="divide-y divide-ink-100">
                {reports.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Wallet size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-800">Звіт по оплаті праці</p>
                      <p className="text-xs text-ink-400">
                        {r.periodStart} – {r.periodEnd} · {r.departmentId ? departments.find((d) => d.id === r.departmentId)?.name : "Уся компанія"} · сформував {userById(r.generatedBy)?.fullName.split(" ")[0]}
                      </p>
                    </div>
                    <Badge tone="gray">{r.format}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
