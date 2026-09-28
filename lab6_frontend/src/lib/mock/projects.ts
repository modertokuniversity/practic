import type { Project, ProjectTask } from "@/lib/types";
import { toLocalISODate } from "@/lib/utils";

function rel(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return toLocalISODate(d);
}

// 12 демонстраційних проєктів у всіх 4 підрозділах, з різними статусами
// (planning / active / on_hold / completed), керівниками (leadId) та
// призначеними учасниками (memberIds) — саме memberIds відображає функцію
// "керівник обирає, хто над яким проєктом працює".
export const projects: Project[] = [
  {
    id: 1, name: "TimeTracker Web", clientName: "Внутрішній проєкт", color: "#7C3AED",
    status: "active", departmentId: 1, budgetHours: 480, leadId: 3, memberIds: [3, 6, 7, 8, 12],
    startDate: rel(-60), deadline: rel(30), description: "Розробка вебзастосунку обліку робочого часу (цей проєкт — курсова робота).",
  },
  {
    id: 2, name: "Mobile App v2", clientName: "Внутрішній проєкт", color: "#0EA5E9",
    status: "active", departmentId: 1, budgetHours: 320, leadId: 7, memberIds: [3, 7, 11, 12],
    startDate: rel(-40), deadline: rel(50), description: "Друга версія мобільного застосунку з офлайн-режимом чекін/чекаут.",
  },
  {
    id: 3, name: "CRM для клієнта Nova", clientName: "Nova Logistics", color: "#F59E0B",
    status: "active", departmentId: 1, budgetHours: 260, leadId: 8, memberIds: [8, 9, 10],
    startDate: rel(-25), deadline: rel(20), description: "Кастомна CRM-система для відділу логістики клієнта Nova.",
  },
  {
    id: 4, name: "Redesign сайту", clientName: "Внутрішній проєкт", color: "#EC4899",
    status: "on_hold", departmentId: 1, budgetHours: 120, leadId: 12, memberIds: [12],
    startDate: rel(-90), deadline: null, description: "Оновлення дизайну маркетингового сайту компанії. Призупинено до Q1.",
  },
  {
    id: 5, name: "Інтеграція з 1С", clientName: "Бухгалтерія (внутрішній)", color: "#10B981",
    status: "active", departmentId: 3, budgetHours: 90, leadId: 17, memberIds: [16, 17],
    startDate: rel(-15), deadline: rel(15), description: "Автоматичне вивантаження проводок і звірка залишків з 1С.",
  },
  {
    id: 6, name: "Кампанія Q4", clientName: "Внутрішній проєкт", color: "#6366F1",
    status: "completed", departmentId: 2, budgetHours: 150, leadId: 4, memberIds: [4, 13, 14],
    startDate: rel(-120), deadline: rel(-10), description: "Маркетингова кампанія четвертого кварталу — завершена, підбито підсумки.",
  },
  {
    id: 7, name: "Партнерська інтеграція API", clientName: "PartnerHub", color: "#14B8A6",
    status: "planning", departmentId: 1, budgetHours: 200, leadId: 6, memberIds: [6, 9],
    startDate: rel(5), deadline: rel(70), description: "Публічний REST API для партнерів — на етапі узгодження вимог.",
  },
  {
    id: 8, name: "Внутрішній портал HR", clientName: "Внутрішній проєкт", color: "#F97316",
    status: "active", departmentId: 1, budgetHours: 180, leadId: 10, memberIds: [10, 11, 18],
    startDate: rel(-20), deadline: rel(25), description: "Самообслуговування для працівників: заявки, документи, профіль.",
  },
  {
    id: 9, name: "Оптимізація продуктивності", clientName: "Внутрішній проєкт", color: "#8B5CF6",
    status: "active", departmentId: 1, budgetHours: 140, leadId: 3, memberIds: [7, 8, 12],
    startDate: rel(-10), deadline: rel(15), description: "Профілювання й пришвидшення найповільніших запитів та сторінок.",
  },
  {
    id: 10, name: "Лендінг нового продукту", clientName: "Внутрішній проєкт", color: "#DB2777",
    status: "active", departmentId: 2, budgetHours: 100, leadId: 4, memberIds: [13, 15],
    startDate: rel(-8), deadline: rel(12), description: "Промо-сторінка для запуску нового тарифного плану.",
  },
  {
    id: 11, name: "Автоматизація звітності", clientName: "Бухгалтерія (внутрішній)", color: "#059669",
    status: "planning", departmentId: 3, budgetHours: 160, leadId: 5, memberIds: [5, 16, 17],
    startDate: rel(10), deadline: rel(80), description: "Автогенерація щомісячних фінансових звітів замість ручного зведення.",
  },
  {
    id: 12, name: "Мобільний застосунок для складу", clientName: "Nova Logistics", color: "#0891B2",
    status: "on_hold", departmentId: 1, budgetHours: 220, leadId: 9, memberIds: [9, 11],
    startDate: rel(-70), deadline: null, description: "Сканування штрихкодів і облік складських переміщень. Очікує бюджету клієнта.",
  },
];

let taskId = 1;
function t(
  projectId: number,
  title: string,
  status: ProjectTaskInput["status"],
  priority: ProjectTaskInput["priority"],
  assigneeId: number,
  dueDateOffset: number | null,
  estimateMinutes: number | null
): ProjectTask {
  return {
    id: taskId++,
    projectId,
    title,
    status,
    priority,
    assigneeId,
    dueDate: dueDateOffset === null ? null : rel(dueDateOffset),
    estimateMinutes,
  };
}
type ProjectTaskInput = ProjectTask;

export const tasks: ProjectTask[] = [
  // ---- 1. TimeTracker Web ----
  t(1, "Дашборд: віджет поточного таймера", "done", "high", 6, null, 240),
  t(1, "Таблиця табеля з фільтрами", "done", "high", 6, null, 360),
  t(1, "Модалка редагування запису часу", "in_progress", "medium", 7, 1, 180),
  t(1, "Графіки аналітики (Recharts)", "in_progress", "medium", 8, 5, 300),
  t(1, "Сторінка заявок на відпустку", "done", "medium", 9, null, 200),
  t(1, "Ролі та перемикач ролей у Topbar", "done", "high", 6, null, 150),
  t(1, "Адаптивна верстка Sidebar (mobile)", "in_progress", "high", 12, 3, 240),
  t(1, "Пауза/обід у таймері", "todo", "urgent", 6, 0, 200),
  t(1, "Сторінка «Оплата праці» для бухгалтера", "todo", "urgent", 6, 1, 360),
  t(1, "E2E перевірка форм і валідації", "todo", "low", 7, 8, 180),

  // ---- 2. Mobile App v2 ----
  t(2, "Push-сповіщення про запізнення", "in_progress", "medium", 11, 4, 300),
  t(2, "Офлайн-режим для чекін/чекаут", "todo", "high", 7, 8, 420),
  t(2, "Синхронізація календаря змін", "todo", "medium", 12, 10, 240),
  t(2, "Дизайн онбордингу", "done", "low", 3, null, 120),
  t(2, "Біометрична авторизація", "todo", "medium", 7, 20, 300),

  // ---- 3. CRM для Nova ----
  t(3, "API-клієнт для CRM Nova", "in_progress", "high", 8, 2, 360),
  t(3, "Мапінг статусів угод", "todo", "medium", 9, 7, 180),
  t(3, "Тестування імпорту контактів", "done", "low", 10, null, 120),
  t(3, "Дашборд менеджера з продажу", "todo", "high", 8, 14, 300),

  // ---- 4. Redesign сайту ----
  t(4, "Аудит поточного UX", "done", "medium", 12, null, 180),
  t(4, "Нова дизайн-система", "todo", "low", 12, null, 400),

  // ---- 5. Інтеграція з 1С ----
  t(5, "Вивантаження проводок у 1С", "in_progress", "high", 16, 3, 300),
  t(5, "Звірка залишків", "todo", "medium", 17, 9, 180),
  t(5, "Документація формату обміну", "done", "low", 17, null, 90),

  // ---- 6. Кампанія Q4 (завершено) ----
  t(6, "Креативи для соцмереж", "done", "medium", 13, null, 240),
  t(6, "A/B тест лендінгу", "done", "medium", 14, null, 180),
  t(6, "Підсумковий звіт кампанії", "done", "low", 4, null, 120),

  // ---- 7. Партнерська інтеграція API (planning) ----
  t(7, "Збір вимог від партнерів", "in_progress", "high", 6, 6, 240),
  t(7, "Проєктування схеми авторизації API", "todo", "high", 9, 12, 300),
  t(7, "Чернетка документації API", "todo", "low", 6, 25, 200),

  // ---- 8. Внутрішній портал HR ----
  t(8, "Форма заявок на документи", "in_progress", "medium", 10, 6, 240),
  t(8, "Інтеграція з профілем користувача", "todo", "medium", 11, 11, 180),
  t(8, "Погодження UX з HR-командою", "done", "high", 18, null, 120),
  t(8, "Сторінка новин компанії", "todo", "low", 10, 18, 150),

  // ---- 9. Оптимізація продуктивності ----
  t(9, "Профілювання найповільніших запитів", "in_progress", "urgent", 8, 2, 240),
  t(9, "Кешування довідників на клієнті", "todo", "high", 7, 6, 180),
  t(9, "Оптимізація рендеру таблиці табеля", "done", "medium", 12, null, 150),

  // ---- 10. Лендінг нового продукту ----
  t(10, "Копірайтинг та структура сторінки", "done", "medium", 13, null, 180),
  t(10, "Верстка та анімації", "in_progress", "high", 15, 5, 300),
  t(10, "SEO-оптимізація", "todo", "low", 13, 12, 120),

  // ---- 11. Автоматизація звітності (planning) ----
  t(11, "Специфікація форматів звітів", "todo", "high", 5, 15, 240),
  t(11, "Шаблони для щомісячного зведення", "todo", "medium", 16, 20, 200),

  // ---- 12. Мобільний застосунок для складу (on_hold) ----
  t(12, "Прототип сканування штрихкодів", "done", "medium", 9, null, 300),
  t(12, "Узгодження бюджету з клієнтом", "todo", "urgent", 9, 3, 60),
];

export function tasksByProject(projectId: number) {
  return tasks.filter((tk) => tk.projectId === projectId);
}
export function tasksByAssignee(userId: number) {
  return tasks.filter((tk) => tk.assigneeId === userId);
}
