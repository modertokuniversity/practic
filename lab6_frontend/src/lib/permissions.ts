// Єдине джерело правди для рольової моделі доступу на frontend.
// Кожна функція тут відповідає конкретному пункту вимог лаб. роботи №6-7 —
// коментар над функцією вказує, звідки саме походить обмеження.
// Той самий перелік прав продубльовано в API_CONTRACT.md як специфікація
// для backend-перевірок (frontend-перевірки — лише для UX, не для безпеки).

import type { User, Project } from "@/lib/types";

const MANAGEMENT_ROLES = ["manager", "admin"] as const;

/** Керівник підрозділу, HR або адміністратор — "керівний" рівень доступу. */
export function isManagerLike(user: User): boolean {
  return user.role === "manager" || user.role === "hr_admin" || user.role === "admin" || user.role === "accountant";
}

/** Хто бачить розділ "Команда" / "Звіти" в навігації. */
export function canViewTeamAndReports(user: User): boolean {
  return user.role === "manager" || user.role === "hr_admin" || user.role === "admin";
}

/**
 * Додавати/редагувати/видаляти запис часу "заднім числом" (не через живий
 * таймер) — лише відповідальні ролі: керівник, адміністратор, або
 * технічно відповідальний (лід) конкретного проєкту, якщо запис прив'язано
 * до його проєкту. Рядовий працівник може лише запускати/зупиняти власний
 * таймер — це і є вимога "додавати записи про роботу, яка фактично не
 * відбулася, можуть лише відповідальні ролі".
 */
export function canManageTimeEntryFor(actor: User, targetProjectId: number | null, projects: Project[]): boolean {
  if (actor.role === "manager" || actor.role === "admin") return true;
  if (targetProjectId) {
    const project = projects.find((p) => p.id === targetProjectId);
    if (project && project.leadId === actor.id) return true;
  }
  return false;
}

/** Чи має користувач право створювати ХОЧА Б ОДИН ручний запис (керує видимістю кнопки) —
 * керівник/адмін завжди, або лід хоча б одного проєкту. */
export function canCreateAnyManualEntry(actor: User, projects: Project[]): boolean {
  if (actor.role === "manager" || actor.role === "admin") return true;
  return projects.some((p) => p.leadId === actor.id);
}

/** Чи може бачити/редагувати табель ІНШИХ людей (не лише свій). */
export function canManageOthersTimesheet(user: User): boolean {
  return user.role === "manager" || user.role === "admin";
}

/** Створення нових проєктів та призначення учасників — керівник і адмін. */
export function canManageProjects(user: User): boolean {
  return user.role === "manager" || user.role === "admin";
}

/** Чи може конкретний користувач редагувати саме цей проєкт (свій підрозділ). */
export function canEditProject(user: User, project: Project): boolean {
  if (user.role === "admin") return true;
  if (user.role === "manager") return project.departmentId === user.departmentId;
  return false;
}

/** Зміна пріоритету задачі — керівник і адмін (планувальне рішення). */
export function canChangeTaskPriority(user: User): boolean {
  return user.role === "manager" || user.role === "admin";
}

/** Зміна статусу задачі (viewer/kanban) — виконавець задачі, керівник, адмін. */
export function canChangeTaskStatus(user: User, assigneeId: number): boolean {
  return user.id === assigneeId || user.role === "manager" || user.role === "admin";
}

/** Призначення вартості години працівника — керівник (своїх людей) і адмін. */
export function canSetHourlyRate(user: User): boolean {
  return user.role === "manager" || user.role === "admin";
}

/** Розділ "Оплата праці" (звіти бухгалтера) — бухгалтер, адмін, керівник (обмежено своїм відділом). */
export function canViewPayroll(user: User): boolean {
  return user.role === "accountant" || user.role === "admin" || user.role === "manager";
}

/** Чи бачить фінансові показники (вартість/год, собівартість) у звітах. */
export function canViewFinancials(user: User): boolean {
  return user.role === "accountant" || user.role === "admin" || user.role === "manager";
}

export function roleLabelUk(role: User["role"]): string {
  switch (role) {
    case "employee":
      return "Працівник";
    case "manager":
      return "Керівник підрозділу";
    case "hr_admin":
      return "HR-адміністратор";
    case "admin":
      return "Адміністратор системи";
    case "accountant":
      return "Бухгалтер";
    default:
      return role;
  }
}
