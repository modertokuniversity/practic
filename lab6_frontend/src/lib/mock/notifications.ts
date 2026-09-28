import type { AppNotification, AuditLogEntry, ReportRecord } from "@/lib/types";
import { toLocalISODate } from "@/lib/utils";

function relDT(days: number, h = 9, m = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export const notifications: AppNotification[] = [
  { id: 1, userId: 6, type: "leave_status_changed", title: "Заявку затверджено", message: "Вашу заявку на відпустку затверджено керівником.", isRead: false, createdAt: relDT(-3, 10, 15) },
  { id: 2, userId: 6, type: "system", title: "Графік на наступний тиждень опубліковано", message: "Керівник опублікував графік змін на наступний тиждень.", isRead: false, createdAt: relDT(-1, 17, 0) },
  { id: 3, userId: 6, type: "schedule_published", title: "Нагадування", message: "Не забудьте відмітити прихід сьогодні вранці.", isRead: true, createdAt: relDT(-2, 8, 30) },
  { id: 4, userId: 3, type: "late_alert", title: "Запізнення співробітника", message: "Кравець Тарас Миколайович запізнився на 32 хв.", isRead: false, createdAt: relDT(-2, 9, 33) },
  { id: 5, userId: 3, type: "missing_checkout", title: "Незафіксований відхід", message: "Іванов Дмитро Сергійович не відмітив завершення робочого дня.", isRead: false, createdAt: relDT(-3, 20, 0) },
  { id: 6, userId: 3, type: "leave_status_changed", title: "Нова заявка на розгляд", message: "Поліщук Софія подала заявку на відпустку.", isRead: false, createdAt: relDT(-1, 11, 0) },
  { id: 7, userId: 2, type: "system", title: "Обліковий запис деактивовано", message: "Романюк Софія Юріївна деактивована адміністратором.", isRead: true, createdAt: relDT(-5, 12, 0) },
  { id: 8, userId: 1, type: "system", title: "Резервне копіювання виконано", message: "Щоденне резервне копіювання бази даних успішно завершено.", isRead: true, createdAt: relDT(0, 3, 0) },
];

export const auditLog: AuditLogEntry[] = [
  { id: 1, userId: 3, action: "UPDATE", entityType: "time_entry", description: "Відкориговано запис часу Гнатишак А.Й. за вчора (додано відсутній чекаут)", createdAt: relDT(-1, 9, 10) },
  { id: 2, userId: 3, action: "APPROVE", entityType: "leave_request", description: "Затверджено заявку на відпустку Гнатишак А.Й.", createdAt: relDT(-3, 10, 15) },
  { id: 3, userId: 4, action: "REJECT", entityType: "leave_request", description: "Відхилено заявку на відпустку Гринько М.А.", createdAt: relDT(-4, 14, 20) },
  { id: 4, userId: 1, action: "UPDATE", entityType: "user", description: "Деактивовано обліковий запис Романюк С.Ю.", createdAt: relDT(-5, 12, 0) },
  { id: 5, userId: 1, action: "INSERT", entityType: "department_shift_templates", description: "Додано шаблон «Ранкова» для Відділу продажів", createdAt: relDT(-9, 10, 0) },
  { id: 6, userId: 2, action: "UPDATE", entityType: "leave_balance", description: "Оновлено залишок відпустки для 15 співробітників (новий рік)", createdAt: relDT(-20, 9, 0) },
];

export const reports: ReportRecord[] = [
  { id: 1, type: "attendance_summary", departmentId: 1, periodStart: relIso(-12), periodEnd: relIso(-1), generatedBy: 3, generatedAt: relDT(0, 8, 30), format: "PDF" },
  { id: 2, type: "lateness_summary", departmentId: null, periodStart: relIso(-30), periodEnd: relIso(-1), generatedBy: 2, generatedAt: relDT(-1, 9, 0), format: "XLSX" },
  { id: 3, type: "leave_summary", departmentId: 3, periodStart: `${new Date().getFullYear()}-01-01`, periodEnd: `${new Date().getFullYear()}-12-31`, generatedBy: 5, generatedAt: relDT(-6, 8, 0), format: "PDF" },
  { id: 4, type: "department_summary", departmentId: 2, periodStart: relIso(-30), periodEnd: relIso(-1), generatedBy: 4, generatedAt: relDT(-2, 16, 45), format: "PDF" },
];

function relIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toLocalISODate(d);
}
