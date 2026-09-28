import type { TimeEntry, LeaveRequest, Project, ProjectTask, User } from "@/lib/types";
import { schedules } from "@/lib/mock/attendance";
import { users, departmentById, userById } from "@/lib/mock/reference";
import { toLocalISODate } from "@/lib/utils";

export function workedMinutes(entry: TimeEntry): number {
  if (!entry.checkOut) {
    // "in_progress" — сесія справді триває зараз, рахуємо від checkIn до now.
    // "missing_checkout" — забутий чекаут у МИНУЛОМУ; екстраполювати до now
    // тут не можна (це дало б сотні "годин"), тривалість вважається невідомою.
    if (entry.status === "in_progress") {
      return Math.max(0, Math.round((Date.now() - new Date(entry.checkIn).getTime()) / 60000));
    }
    return 0;
  }
  return Math.max(0, Math.round((new Date(entry.checkOut).getTime() - new Date(entry.checkIn).getTime()) / 60000));
}

export function lateMinutes(entry: TimeEntry): number {
  const sched = schedules.find((s) => s.userId === entry.userId && s.workDate === entry.workDate);
  if (!sched) return 0;
  const diff = (new Date(entry.checkIn).getTime() - new Date(sched.plannedStart).getTime()) / 60000;
  return diff > 0 ? Math.round(diff) : 0;
}

function last7Dates(): string[] {
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(toLocalISODate(d));
  }
  return out;
}

export function weeklyHoursSeries(entries: TimeEntry[], userId?: number) {
  const dates = last7Dates();
  return dates.map((date) => {
    const dayEntries = entries.filter((e) => e.workDate === date && (userId ? e.userId === userId : true));
    const minutes = dayEntries.reduce((sum, e) => sum + workedMinutes(e), 0);
    const label = new Date(date).toLocaleDateString("uk-UA", { weekday: "short" });
    return { date, label: label.charAt(0).toUpperCase() + label.slice(1).replace(".", ""), hours: Math.round((minutes / 60) * 10) / 10 };
  });
}

export function totalHoursThisWeek(entries: TimeEntry[], userId?: number): number {
  const series = weeklyHoursSeries(entries, userId);
  return Math.round(series.reduce((s, d) => s + d.hours, 0) * 10) / 10;
}

export function currentlyCheckedIn(entries: TimeEntry[], departmentId?: number) {
  const todayIso = toLocalISODate(new Date());
  return entries
    .filter((e) => e.workDate === todayIso && !e.checkOut)
    .map((e) => ({ entry: e, user: users.find((u) => u.id === e.userId)! }))
    .filter((x) => x.user && (departmentId ? x.user.departmentId === departmentId : true));
}

export function lateEntriesThisWeek(entries: TimeEntry[], departmentId?: number) {
  const dates = last7Dates();
  return entries
    .filter((e) => dates.includes(e.workDate))
    .map((e) => ({ entry: e, user: users.find((u) => u.id === e.userId)!, late: lateMinutes(e) }))
    .filter((x) => x.late > 0 && x.user && (departmentId ? x.user.departmentId === departmentId : true))
    .sort((a, b) => b.late - a.late);
}

export function departmentHoursBreakdown(entries: TimeEntry[]) {
  const map = new Map<number, number>();
  entries.forEach((e) => {
    const user = users.find((u) => u.id === e.userId);
    if (!user?.departmentId) return;
    map.set(user.departmentId, (map.get(user.departmentId) ?? 0) + workedMinutes(e));
  });
  return Array.from(map.entries()).map(([departmentId, minutes]) => ({
    department: departmentById(departmentId)?.name ?? "—",
    color: departmentById(departmentId)?.color ?? "#999",
    hours: Math.round((minutes / 60) * 10) / 10,
  }));
}

export function pendingLeaveRequests(requests: LeaveRequest[], departmentId?: number) {
  return requests
    .filter((r) => r.status === "pending")
    .map((r) => ({ request: r, user: users.find((u) => u.id === r.userId)! }))
    .filter((x) => x.user && (departmentId ? x.user.departmentId === departmentId : true));
}

export function missingCheckoutToday(entries: TimeEntry[]) {
  return entries.filter((e) => e.status === "missing_checkout");
}

// ---------------------------------------------------------------------------
// Аналітика проєктів і звіт бухгалтера (лаб. робота №6-7) — окремі агрегатори,
// щоб графіки на сторінці проєкту й на сторінці "Оплата праці" не дублювали
// логіку дашборду/звітів (кожен розділ показує свій розріз даних).
// ---------------------------------------------------------------------------

/** Записи часу, що стосуються конкретного проєкту, в межах періоду (включно). */
export function entriesForProject(entries: TimeEntry[], projectId: number, from?: string, to?: string) {
  return entries.filter(
    (e) => e.projectId === projectId && (!from || e.workDate >= from) && (!to || e.workDate <= to)
  );
}

/** Динаміка витраченого часу по проєкту за останні `days` календарних днів. */
export function projectTimeSeries(entries: TimeEntry[], projectId: number, days = 14) {
  const out: { date: string; label: string; hours: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = toLocalISODate(d);
    const minutes = entries
      .filter((e) => e.projectId === projectId && e.workDate === iso)
      .reduce((sum, e) => sum + workedMinutes(e), 0);
    const label = d.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" });
    out.push({ date: iso, label, hours: Math.round((minutes / 60) * 10) / 10 });
  }
  return out;
}

/** Навантаження учасників проєкту: скільки годин відпрацював кожен за весь час проєкту. */
export function projectWorkloadByMember(entries: TimeEntry[], projectId: number, memberIds: number[]) {
  return memberIds
    .map((userId) => {
      const minutes = entries
        .filter((e) => e.projectId === projectId && e.userId === userId)
        .reduce((sum, e) => sum + workedMinutes(e), 0);
      const user = userById(userId);
      return { userId, name: user?.fullName ?? "—", color: user?.avatarColor ?? "#999", hours: Math.round((minutes / 60) * 10) / 10 };
    })
    .sort((a, b) => b.hours - a.hours);
}

/** Виконання задач проєкту за статусами — для донат-діаграми прогресу. */
export function projectTaskBreakdown(tasks: ProjectTask[], projectId: number) {
  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  const done = projectTasks.filter((t) => t.status === "done").length;
  const inProgress = projectTasks.filter((t) => t.status === "in_progress").length;
  const todo = projectTasks.filter((t) => t.status === "todo").length;
  return { total: projectTasks.length, done, inProgress, todo };
}

/** Планові (оцінка задач, год) проти фактично відпрацьованих годин по проєкту. */
export function projectPlannedVsActual(entries: TimeEntry[], tasks: ProjectTask[], projectId: number) {
  const plannedMinutes = tasks.filter((t) => t.projectId === projectId).reduce((sum, t) => sum + (t.estimateMinutes ?? 0), 0);
  const actualMinutes = entries.filter((e) => e.projectId === projectId).reduce((sum, e) => sum + workedMinutes(e), 0);
  return {
    plannedHours: Math.round((plannedMinutes / 60) * 10) / 10,
    actualHours: Math.round((actualMinutes / 60) * 10) / 10,
  };
}

/** Фактична собівартість проєкту (сума годин × ставка кожного працівника).
 * `rates` — опційна мапа userId → ставка (з живого store.hourlyRates); якщо не
 * передано, використовується базова ставка з довідника users.ts. */
export function projectCost(entries: TimeEntry[], projectId: number, rates?: Record<number, number>): number {
  const byUser = new Map<number, number>();
  entries
    .filter((e) => e.projectId === projectId)
    .forEach((e) => byUser.set(e.userId, (byUser.get(e.userId) ?? 0) + workedMinutes(e)));
  let cost = 0;
  byUser.forEach((minutes, userId) => {
    const rate = rates?.[userId] ?? userById(userId)?.hourlyRate ?? 0;
    cost += (minutes / 60) * rate;
  });
  return Math.round(cost);
}

export interface PayrollRow {
  user: User;
  minutes: number;
  hours: number;
  hourlyRate: number;
  cost: number;
}

/**
 * Рядки звіту "Оплата праці": відпрацьовані години й собівартість за період,
 * з опційним фільтром по відділу/проєкту/працівнику. Це саме той агрегатор,
 * що живить сторінку /payroll — не використовується більше ніде, щоб уникнути
 * дублювання графіків між розділами.
 */
export function payrollRows(
  entries: TimeEntry[],
  filters: { from: string; to: string; departmentId?: number | null; projectId?: number | null; userId?: number | null },
  rates?: Record<number, number>
): PayrollRow[] {
  const filtered = entries.filter(
    (e) =>
      e.workDate >= filters.from &&
      e.workDate <= filters.to &&
      (!filters.projectId || e.projectId === filters.projectId) &&
      (!filters.userId || e.userId === filters.userId)
  );
  const byUser = new Map<number, number>();
  filtered.forEach((e) => {
    const user = userById(e.userId);
    if (!user) return;
    if (filters.departmentId && user.departmentId !== filters.departmentId) return;
    byUser.set(e.userId, (byUser.get(e.userId) ?? 0) + workedMinutes(e));
  });
  return Array.from(byUser.entries())
    .map(([userId, minutes]) => {
      const user = userById(userId)!;
      const hours = Math.round((minutes / 60) * 10) / 10;
      const rate = rates?.[userId] ?? user.hourlyRate;
      return { user, minutes, hours, hourlyRate: rate, cost: Math.round(hours * rate) };
    })
    .sort((a, b) => b.cost - a.cost);
}

export function payrollByProject(
  entries: TimeEntry[],
  projects: Project[],
  filters: { from: string; to: string; departmentId?: number | null },
  rates?: Record<number, number>
) {
  return projects
    .map((project) => {
      const filtered = entries.filter(
        (e) => e.projectId === project.id && e.workDate >= filters.from && e.workDate <= filters.to
      );
      let minutes = 0;
      let cost = 0;
      filtered.forEach((e) => {
        const user = userById(e.userId);
        if (!user) return;
        if (filters.departmentId && user.departmentId !== filters.departmentId) return;
        const m = workedMinutes(e);
        const rate = rates?.[e.userId] ?? user.hourlyRate;
        minutes += m;
        cost += (m / 60) * rate;
      });
      return { project, hours: Math.round((minutes / 60) * 10) / 10, cost: Math.round(cost) };
    })
    .filter((row) => row.hours > 0);
}
