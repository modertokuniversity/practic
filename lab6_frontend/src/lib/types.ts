// Типи відповідають логічній моделі бази даних із лабораторної роботи №5
// (sql/01_schema.sql) — тут розширені для потреб frontend-шару лаб. роботи №6-7.
// Поля, яких НЕМАЄ в оригінальній схемі lab5 (hourlyRate, memberIds, leadId,
// pauseMinutes/lunchMinutes тощо), позначені коментарем "NEW" — саме вони
// описані в API_CONTRACT.md як розширення схеми для майбутнього backend.

export type UserRole = "employee" | "manager" | "hr_admin" | "admin" | "accountant"; // accountant — NEW

export interface Department {
  id: number;
  name: string;
  managerId: number | null;
  color: string;
}

export interface Position {
  id: number;
  title: string;
}

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  departmentId: number | null;
  positionId: number | null;
  avatarColor: string;
  isActive: boolean;
  hireDate: string;
  hourlyRate: number; // NEW — вартість години працівника (грн/год), призначає керівник
}

export type ShiftStatus = "planned" | "confirmed" | "cancelled";

export interface ShiftTemplate {
  id: number;
  name: string;
  startTime: string; // "09:00"
  endTime: string; // "18:00"
  breakMinutes: number;
}

export interface Schedule {
  id: number;
  userId: number;
  workDate: string; // ISO date
  shiftTemplateId: number | null;
  plannedStart: string; // ISO datetime
  plannedEnd: string; // ISO datetime
  status: ShiftStatus;
}

export type TimeEntryStatus = "in_progress" | "completed" | "edited" | "missing_checkout";

/** Джерело створення запису часу — визначає, чи це "чесний" трек чи ручне
 * втручання відповідальної особи (NEW — саме це розмежування реалізує вимогу
 * "додавати заднім числом можуть лише відповідальні ролі"). */
export type TimeEntrySource = "timer" | "manual";

export interface TimeEntry {
  id: number;
  userId: number;
  workDate: string;
  checkIn: string; // ISO datetime
  checkOut: string | null; // ISO datetime
  status: TimeEntryStatus;
  projectId: number | null;
  taskId: number | null;
  note?: string;
  source: TimeEntrySource; // NEW
  createdBy: number; // NEW — хто фактично створив запис (для manual — керівник/адмін)
  pauseMinutes?: number; // NEW — сумарний час пауз усередині сесії таймера
  lunchMinutes?: number; // NEW — сумарний час обіду усередині сесії таймера
}

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveType {
  id: number;
  name: string;
  isPaid: boolean;
  annualLimitDays: number | null;
  color: string;
}

export interface LeaveRequest {
  id: number;
  userId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  approverId: number | null;
  createdAt: string;
}

export interface LeaveBalance {
  userId: number;
  leaveTypeId: number;
  year: number;
  totalDays: number;
  usedDays: number;
}

export interface Holiday {
  id: number;
  name: string;
  date: string;
}

export type NotificationType =
  | "leave_status_changed"
  | "late_alert"
  | "schedule_published"
  | "missing_checkout"
  | "system"
  | "project_assigned" // NEW
  | "task_priority_changed"; // NEW

export interface AppNotification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: number;
  userId: number | null;
  action: string;
  entityType: string;
  description: string;
  createdAt: string;
}

export type ReportType =
  | "attendance_summary"
  | "lateness_summary"
  | "leave_summary"
  | "department_summary"
  | "payroll_cost_summary"; // NEW — звіт бухгалтера

export interface ReportRecord {
  id: number;
  type: ReportType;
  departmentId: number | null;
  periodStart: string;
  periodEnd: string;
  generatedBy: number;
  generatedAt: string;
  format: "PDF" | "XLSX";
}

// --- Розширення поза межами лаб. роботи №5: проєкти й задачі (в стилі Akiflow) ---

export type ProjectStatus = "active" | "on_hold" | "completed" | "planning";

export interface Project {
  id: number;
  name: string;
  clientName: string;
  color: string;
  status: ProjectStatus;
  departmentId: number;
  budgetHours: number;
  leadId: number; // NEW — відповідальний за технічну частину проєкту (може створювати ручні записи по проєкту)
  memberIds: number[]; // NEW — хто призначений працювати над проєктом (призначає керівник)
  startDate: string; // NEW
  deadline: string | null; // NEW
  description: string; // NEW
}

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent"; // urgent — NEW

export interface ProjectTask {
  id: number;
  projectId: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: number;
  dueDate: string | null;
  estimateMinutes: number | null;
}
