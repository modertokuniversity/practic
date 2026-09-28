// =====================================================================
// generate_er_diagram.js
// Генератор ER-діаграми бази даних (SVG) для лабораторної роботи №5.
// Тема: Вебзастосунок для обліку робочого часу працівників.
//
// Запуск:  node generate_er_diagram.js   →  створює er_diagram.svg
// Потім (потребує ImageMagick):  magick er_diagram.svg -background white -flatten er_diagram.png
// =====================================================================
const fs = require("fs");

const FONT = "Arial, sans-serif";
const ROW_H = 24;
const HEADER_H = 40;
const PAD = 14;

// ---------------------------------------------------------------------
// table(): малює прямокутник сутності зі списком атрибутів.
// columns: [{name, type, key: "PK"|"FK"|"PK,FK"|null, note}]
// повертає { id, x, y, width, height, svg, anchors } — anchors дають
// координати країв (top/bottom/left/right, і центр кожного рядка) для
// побудови зв'язків.
// ---------------------------------------------------------------------
function table(id, x, y, title, columns, { width = 300, fill = "#dae8fc" } = {}) {
  const height = HEADER_H + columns.length * ROW_H + PAD;
  let svg = "";
  svg += `<g data-table="${id}">`;
  svg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="#000" stroke-width="1.4"/>`;
  svg += `<rect x="${x}" y="${y}" width="${width}" height="${HEADER_H}" fill="${fill}" stroke="#000" stroke-width="1.4"/>`;
  svg += `<text x="${x + width / 2}" y="${y + 26}" font-family="${FONT}" font-size="17" font-weight="bold" text-anchor="middle">${title}</text>`;
  svg += `<line x1="${x}" y1="${y + HEADER_H}" x2="${x + width}" y2="${y + HEADER_H}" stroke="#000" stroke-width="1.4"/>`;

  const rowAnchors = {};
  columns.forEach((col, i) => {
    const ry = y + HEADER_H + i * ROW_H;
    const textY = ry + ROW_H - 8;
    const keyLabel = col.key ? col.key : "";
    svg += `<text x="${x + 10}" y="${textY}" font-family="${FONT}" font-size="13" ${col.key ? 'font-weight="bold"' : ""}>${keyLabel}</text>`;
    svg += `<text x="${x + 52}" y="${textY}" font-family="${FONT}" font-size="13" ${col.key ? 'font-weight="bold"' : ""}>${col.name}</text>`;
    svg += `<text x="${x + width - 10}" y="${textY}" font-family="${FONT}" font-size="12" fill="#444" text-anchor="end" font-style="italic">${col.type}</text>`;
    if (i > 0) svg += `<line x1="${x}" y1="${ry}" x2="${x + width}" y2="${ry}" stroke="#bbb" stroke-width="0.7"/>`;
    rowAnchors[col.name] = { left: { x, y: ry + ROW_H / 2 }, right: { x: x + width, y: ry + ROW_H / 2 } };
  });
  svg += `</g>`;

  return {
    id, x, y, width, height, svg,
    top: { x: x + width / 2, y },
    bottom: { x: x + width / 2, y: y + height },
    left: { x, y: y + height / 2 },
    right: { x: x + width, y: y + height / 2 },
    topAt: (px) => ({ x: px, y }),
    bottomAt: (px) => ({ x: px, y: y + height }),
    row: rowAnchors,
  };
}

// ---------------------------------------------------------------------
// orthoLine(): ламана (Manhattan-style) лінія через довільні проміжні
// точки — для акуратних прямокутних маршрутів без хаотичних діагоналей.
// ---------------------------------------------------------------------
function orthoLine(points, { dash = false, label = null, labelAt = null, color = "#333", markerEnd = true, width = 1.4 } = {}) {
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  let svg = `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" ${dash ? 'stroke-dasharray="6,4"' : ""} ${markerEnd ? 'marker-end="url(#crow)"' : ""}/>`;
  if (label) {
    const lp = labelAt || points[Math.floor(points.length / 2)];
    svg += `<rect x="${lp.x - label.length * 3.4 - 4}" y="${lp.y - 11}" width="${label.length * 6.8 + 8}" height="16" fill="#ffffff" opacity="0.85"/>`;
    svg += `<text x="${lp.x}" y="${lp.y + 2}" font-family="${FONT}" font-size="11.5" fill="${color}" text-anchor="middle" font-style="italic">${label}</text>`;
  }
  return svg;
}

// =====================================================================
// РОЗМІТКА: 6 колонок x 4 ряди
// =====================================================================
const COL = [140, 580, 1020, 1460, 1900, 2340];
const ROW = [90, 430, 800, 1150];

let svg = [];
let defs = `
<defs>
  <marker id="crow" markerWidth="12" markerHeight="10" refX="10" refY="5" orient="auto">
    <path d="M0,0 L10,5 L0,10" fill="none" stroke="#333" stroke-width="1.4"/>
  </marker>
</defs>`;

// ---------------------------------------------------------------------
// Ряд 1 — довідники верхнього рівня + users (хаб)
// ---------------------------------------------------------------------
const positions = table("positions", COL[0], ROW[0], "positions", [
  { name: "id", type: "SERIAL", key: "PK" },
  { name: "title", type: "VARCHAR(120)" },
  { name: "description", type: "TEXT" },
]);

const departments = table("departments", COL[1], ROW[0], "departments", [
  { name: "id", type: "SERIAL", key: "PK" },
  { name: "name", type: "VARCHAR(150)" },
  { name: "manager_id", type: "INTEGER", key: "FK,UQ" },
  { name: "created_at", type: "TIMESTAMPTZ" },
]);

const users = table("users", COL[2], ROW[0], "users", [
  { name: "id", type: "SERIAL", key: "PK" },
  { name: "email", type: "VARCHAR(255)", key: "UQ" },
  { name: "full_name", type: "VARCHAR(200)" },
  { name: "role", type: "user_role" },
  { name: "department_id", type: "INTEGER", key: "FK" },
  { name: "position_id", type: "INTEGER", key: "FK" },
  { name: "hire_date", type: "DATE" },
  { name: "is_active", type: "BOOLEAN" },
], { width: COL[3] + 300 - COL[2] });

const leaveTypes = table("leave_types", COL[4], ROW[0], "leave_types", [
  { name: "id", type: "SERIAL", key: "PK" },
  { name: "name", type: "VARCHAR(100)" },
  { name: "is_paid", type: "BOOLEAN" },
  { name: "annual_limit_days", type: "SMALLINT" },
]);

const holidays = table("holidays", COL[5], ROW[0], "holidays", [
  { name: "id", type: "SERIAL", key: "PK" },
  { name: "name", type: "VARCHAR(150)" },
  { name: "holiday_date", type: "DATE", key: "UQ" },
  { name: "is_recurring", type: "BOOLEAN" },
]);

// ---------------------------------------------------------------------
// Ряд 2 — операційні таблиці
// ---------------------------------------------------------------------
const shiftTemplates = table("shift_templates", COL[0], ROW[1], "shift_templates", [
  { name: "id", type: "SERIAL", key: "PK" },
  { name: "name", type: "VARCHAR(100)" },
  { name: "start_time", type: "TIME" },
  { name: "end_time", type: "TIME" },
]);

const deptShiftTemplates = table("department_shift_templates", COL[1], ROW[1], "department_shift_templates", [
  { name: "department_id", type: "INTEGER", key: "PK,FK" },
  { name: "shift_template_id", type: "INTEGER", key: "PK,FK" },
]);

const schedules = table("schedules", COL[2], ROW[1], "schedules", [
  { name: "id", type: "SERIAL", key: "PK" },
  { name: "user_id", type: "INTEGER", key: "FK" },
  { name: "work_date", type: "DATE" },
  { name: "shift_template_id", type: "INTEGER", key: "FK" },
  { name: "planned_start", type: "TIMESTAMPTZ" },
  { name: "planned_end", type: "TIMESTAMPTZ" },
  { name: "status", type: "schedule_status" },
  { name: "created_by", type: "INTEGER", key: "FK" },
]);

const timeEntries = table("time_entries", COL[3], ROW[1], "time_entries", [
  { name: "id", type: "SERIAL", key: "PK" },
  { name: "user_id", type: "INTEGER", key: "FK" },
  { name: "work_date", type: "DATE" },
  { name: "check_in", type: "TIMESTAMPTZ" },
  { name: "check_out", type: "TIMESTAMPTZ" },
  { name: "status", type: "time_entry_status" },
  { name: "worked_minutes", type: "INTEGER" },
]);

const leaveRequests = table("leave_requests", COL[4], ROW[1], "leave_requests", [
  { name: "id", type: "SERIAL", key: "PK" },
  { name: "user_id", type: "INTEGER", key: "FK" },
  { name: "leave_type_id", type: "INTEGER", key: "FK" },
  { name: "start_date", type: "DATE" },
  { name: "end_date", type: "DATE" },
  { name: "status", type: "leave_request_status" },
  { name: "approver_id", type: "INTEGER", key: "FK" },
]);

const leaveBalances = table("leave_balances", COL[5], ROW[1], "leave_balances", [
  { name: "id", type: "SERIAL", key: "PK" },
  { name: "user_id", type: "INTEGER", key: "FK" },
  { name: "leave_type_id", type: "INTEGER", key: "FK" },
  { name: "year", type: "SMALLINT" },
  { name: "total_days", type: "NUMERIC(5,1)" },
  { name: "used_days", type: "NUMERIC(5,1)" },
]);

// ---------------------------------------------------------------------
// Ряд 3 — системні / супровідні таблиці
// ---------------------------------------------------------------------
const notifications = table("notifications", COL[0], ROW[2], "notifications", [
  { name: "id", type: "SERIAL", key: "PK" },
  { name: "user_id", type: "INTEGER", key: "FK" },
  { name: "type", type: "notification_type" },
  { name: "title", type: "VARCHAR(200)" },
  { name: "is_read", type: "BOOLEAN" },
]);

const auditLog = table("audit_log", COL[1], ROW[2], "audit_log", [
  { name: "id", type: "BIGSERIAL", key: "PK" },
  { name: "user_id", type: "INTEGER", key: "FK" },
  { name: "action", type: "VARCHAR(50)" },
  { name: "entity_type", type: "VARCHAR(50)" },
  { name: "created_at", type: "TIMESTAMPTZ" },
]);

const reports = table("reports", COL[4], ROW[2], "reports", [
  { name: "id", type: "SERIAL", key: "PK" },
  { name: "report_type", type: "report_type" },
  { name: "department_id", type: "INTEGER", key: "FK" },
  { name: "period_start / end", type: "DATE" },
  { name: "generated_by", type: "INTEGER", key: "FK" },
]);

// ---------------------------------------------------------------------
// Ряд 4 — NEW (лаб. №6-7): проєкти й задачі (зелена заливка — щоб
// одразу візуально відрізнялись від початкової схеми лаб. роботи №5)
// ---------------------------------------------------------------------
const NEW_FILL = "#d5f5e3";

const projects = table("projects", COL[1], ROW[3], "projects", [
  { name: "id", type: "SERIAL", key: "PK" },
  { name: "name", type: "VARCHAR(200)" },
  { name: "status", type: "project_status" },
  { name: "department_id", type: "INTEGER", key: "FK" },
  { name: "budget_hours", type: "NUMERIC(10,1)" },
  { name: "lead_id", type: "INTEGER", key: "FK" },
  { name: "start_date / deadline", type: "DATE" },
], { fill: NEW_FILL });

const projectMembers = table("project_members", COL[2], ROW[3], "project_members", [
  { name: "project_id", type: "INTEGER", key: "PK,FK" },
  { name: "user_id", type: "INTEGER", key: "PK,FK" },
  { name: "added_at", type: "TIMESTAMPTZ" },
], { fill: NEW_FILL });

const projectTasks = table("project_tasks", COL[3], ROW[3], "project_tasks", [
  { name: "id", type: "SERIAL", key: "PK" },
  { name: "project_id", type: "INTEGER", key: "FK" },
  { name: "title", type: "VARCHAR(300)" },
  { name: "status", type: "task_status" },
  { name: "priority", type: "task_priority" },
  { name: "assignee_id", type: "INTEGER", key: "FK" },
  { name: "due_date", type: "DATE" },
  { name: "estimate_minutes", type: "INTEGER" },
], { fill: NEW_FILL });

const allTables = [positions, departments, users, leaveTypes, holidays,
  shiftTemplates, deptShiftTemplates, schedules, timeEntries, leaveRequests, leaveBalances,
  notifications, auditLog, reports, projects, projectMembers, projectTasks];

allTables.forEach(t => svg.push(t.svg));

// =====================================================================
// ЗВ'ЯЗКИ
// =====================================================================
const L = [];

// ---- Ряд 1: через верхній коридор (над таблицями), щоб уникнути
//      перетину діагоналями сусідніх боксів ----
const TOPBUS = 68;
L.push(orthoLine([positions.top, { x: positions.top.x, y: TOPBUS },
                  { x: users.topAt(users.x + 90).x, y: TOPBUS }, users.topAt(users.x + 90)],
                  { label: "position_id" }));

L.push(orthoLine([departments.topAt(departments.x + 90), { x: departments.x + 90, y: 58 },
                  { x: users.topAt(users.x + 220).x, y: 58 }, users.topAt(users.x + 220)],
                  { label: "department_id" }));

L.push(orthoLine([users.topAt(users.x + 300), { x: users.x + 300, y: 76 },
                  { x: departments.x + 220, y: 76 }, departments.topAt(departments.x + 220)],
                  { label: "manager_id (1:1, UQ)", dash: true, color: "#8a1f1f" }));

L.push(orthoLine([leaveTypes.topAt(leaveTypes.x + 60), { x: leaveTypes.x + 60, y: TOPBUS },
                  { x: users.topAt(users.x + users.width - 90).x, y: TOPBUS }, users.topAt(users.x + users.width - 90)],
                  { label: "" }));

// ---- Ряд1 -> Ряд2, ті самі стовпці — прямі вертикалі ----
L.push(orthoLine([departments.bottomAt(departments.x + 90), deptShiftTemplates.topAt(deptShiftTemplates.x + 90)],
                  { label: "department_id" }));

L.push(orthoLine([leaveTypes.bottomAt(leaveTypes.x + 60), leaveRequests.topAt(leaveRequests.x + 60)],
                  { label: "leave_type_id" }));

// leave_types -> leave_balances (сусідня колонка, короткий вигин)
L.push(orthoLine([leaveTypes.bottomAt(leaveTypes.x + 220), { x: leaveTypes.x + 220, y: ROW[1] - 40 },
                  { x: leaveBalances.x + 60, y: ROW[1] - 40 }, leaveBalances.topAt(leaveBalances.x + 60)],
                  { label: "leave_type_id" }));

// users -> schedules (пряма вертикаль, ліва частина хаба)
L.push(orthoLine([users.bottomAt(schedules.x + 90), schedules.topAt(schedules.x + 90)],
                  { label: "user_id" }));
// users -> schedules.created_by (друга лінія, зміщена)
L.push(orthoLine([users.bottomAt(schedules.x + 220), schedules.topAt(schedules.x + 220)],
                  { label: "created_by", dash: true }));

// users -> time_entries (пряма вертикаль, права частина хаба)
L.push(orthoLine([users.bottomAt(timeEntries.x + 150), timeEntries.topAt(timeEntries.x + 150)],
                  { label: "user_id" }));

// users -> leave_requests (короткий вигин праворуч від хаба)
L.push(orthoLine([users.bottomAt(users.x + users.width - 40), { x: users.x + users.width - 40, y: ROW[1] - 55 },
                  { x: leaveRequests.x + 150, y: ROW[1] - 55 }, leaveRequests.topAt(leaveRequests.x + 150)],
                  { label: "user_id" }));
L.push(orthoLine([users.bottomAt(users.x + users.width - 90), { x: users.x + users.width - 90, y: ROW[1] - 25 },
                  { x: leaveRequests.x + 220, y: ROW[1] - 25 }, leaveRequests.topAt(leaveRequests.x + 220)],
                  { label: "approver_id", dash: true }));

// users -> leave_balances (вниз від низу users, у коридор, обходить leave_requests)
L.push(orthoLine([users.bottomAt(users.x + users.width - 10), { x: users.x + users.width - 10, y: ROW[1] - 12 },
                  { x: leaveBalances.x + 220, y: ROW[1] - 12 },
                  leaveBalances.topAt(leaveBalances.x + 220)],
                  { label: "user_id" }));

// shift_templates <-> department_shift_templates (той самий ряд, сусідні; вирівняно по Y приймача)
L.push(orthoLine([{ x: shiftTemplates.x + shiftTemplates.width, y: deptShiftTemplates.left.y },
                  deptShiftTemplates.left],
                  { label: "shift_template_id", labelAt: { x: shiftTemplates.x + shiftTemplates.width - 60, y: deptShiftTemplates.left.y - 10 } }));

// schedules.shift_template_id -> shift_templates (вигин через коридор під рядом2)
const midGap = ROW[1] + 260 + 40;
L.push(orthoLine([schedules.bottomAt(schedules.x + 30), { x: schedules.x + 30, y: midGap },
                  { x: shiftTemplates.x + 220, y: midGap }, shiftTemplates.bottomAt(shiftTemplates.x + 220)],
                  { label: "shift_template_id" }));

// ---- Ряд2 -> Ряд3 ----
// users (хаб) -> notifications, audit_log — через ЛІВЕ поле (за межами боксів)
const LEFTBUS = 50;
L.push(orthoLine([users.bottomAt(users.x + 40), { x: users.x + 40, y: users.bottom.y + 15 },
                  { x: LEFTBUS, y: users.bottom.y + 15 }, { x: LEFTBUS, y: notifications.top.y - 30 },
                  { x: notifications.x + 90, y: notifications.top.y - 30 }, notifications.topAt(notifications.x + 90)],
                  { label: "user_id" }));

L.push(orthoLine([{ x: LEFTBUS, y: notifications.top.y - 30 }, { x: LEFTBUS, y: auditLog.top.y - 15 },
                  { x: auditLog.x + 90, y: auditLog.top.y - 15 }, auditLog.topAt(auditLog.x + 90)],
                  { label: "user_id" }));

// users -> reports.generated_by — вниз у коридор, тоді через ПРАВЕ поле
const RIGHTBUS = COL[5] + 300 + 60;
L.push(orthoLine([users.bottomAt(users.x + users.width - 50), { x: users.x + users.width - 50, y: ROW[1] - 20 },
                  { x: RIGHTBUS, y: ROW[1] - 20 },
                  { x: RIGHTBUS, y: reports.top.y - 45 }, { x: reports.x + 220, y: reports.top.y - 45 },
                  reports.topAt(reports.x + 220)],
                  { label: "generated_by" }));

// departments -> reports.department_id — вниз у коридор (інший y-рівень), тоді праве поле
L.push(orthoLine([departments.bottomAt(departments.x + 220), { x: departments.x + 220, y: 360 },
                  { x: RIGHTBUS + 40, y: 360 },
                  { x: RIGHTBUS + 40, y: reports.top.y - 20 }, { x: reports.x + 90, y: reports.top.y - 20 },
                  reports.topAt(reports.x + 90)],
                  { label: "department_id", dash: true }));

// ---------------------------------------------------------------------
// Ряд 3 -> Ряд 4 — NEW (лаб. №6-7): проєкти й задачі
// ---------------------------------------------------------------------
const NEW_COLOR = "#1a7a41";

// departments -> projects.department_id
L.push(orthoLine([departments.bottomAt(departments.x + 260), { x: departments.x + 260, y: 400 },
                  { x: projects.x + 60, y: 400 }, { x: projects.x + 60, y: ROW[3] - 20 },
                  projects.topAt(projects.x + 60)],
                  { label: "department_id", color: NEW_COLOR }));

// users -> projects.lead_id
L.push(orthoLine([users.bottomAt(users.x + 60), { x: users.x + 60, y: users.bottom.y + 40 },
                  { x: 80, y: users.bottom.y + 40 }, { x: 80, y: ROW[3] + 20 },
                  projects.left],
                  { label: "lead_id", color: NEW_COLOR, dash: true }));

// projects -> project_members.project_id (сусідні таблиці одного ряду)
L.push(orthoLine([projects.right, projectMembers.left],
                  { label: "project_id", color: NEW_COLOR }));

// users -> project_members.user_id (довгий вигин праворуч по нижньому коридору)
const BOTTOMBUS = ROW[3] + 220;
L.push(orthoLine([users.bottomAt(users.x + users.width - 60), { x: users.x + users.width - 60, y: BOTTOMBUS },
                  { x: projectMembers.x + 200, y: BOTTOMBUS }, projectMembers.bottomAt(projectMembers.x + 200)],
                  { label: "user_id", color: NEW_COLOR, dash: true }));

// project_members -> project_tasks.project_id (сусідні таблиці одного ряду)
L.push(orthoLine([projectMembers.right, projectTasks.left],
                  { label: "project_id", color: NEW_COLOR }));

// users -> project_tasks.assignee_id
L.push(orthoLine([users.bottomAt(users.x + users.width - 20), { x: users.x + users.width - 20, y: BOTTOMBUS + 20 },
                  { x: projectTasks.x + 260, y: BOTTOMBUS + 20 }, projectTasks.bottomAt(projectTasks.x + 260)],
                  { label: "assignee_id", color: NEW_COLOR, dash: true }));

// projects -> time_entries.project_id (наскрізний зв'язок ряд4 -> ряд2, через праве поле)
L.push(orthoLine([projects.topAt(projects.x + projects.width - 20), { x: projects.x + projects.width - 20, y: ROW[3] - 40 },
                  { x: RIGHTBUS + 80, y: ROW[3] - 40 }, { x: RIGHTBUS + 80, y: timeEntries.bottom.y + 20 },
                  { x: timeEntries.x + timeEntries.width - 20, y: timeEntries.bottom.y + 20 },
                  timeEntries.bottomAt(timeEntries.x + timeEntries.width - 20)],
                  { label: "project_id", color: NEW_COLOR }));

// project_tasks -> time_entries.task_id (аналогічний наскрізний зв'язок)
L.push(orthoLine([projectTasks.topAt(projectTasks.x + projectTasks.width - 20), { x: projectTasks.x + projectTasks.width - 20, y: ROW[3] - 60 },
                  { x: RIGHTBUS + 100, y: ROW[3] - 60 }, { x: RIGHTBUS + 100, y: timeEntries.bottom.y + 40 },
                  { x: timeEntries.x + timeEntries.width - 40, y: timeEntries.bottom.y + 40 },
                  timeEntries.bottomAt(timeEntries.x + timeEntries.width - 40)],
                  { label: "task_id", color: NEW_COLOR }));

svg.push(...L);

// =====================================================================
// Заголовок і легенда
// =====================================================================
const legend = `
<g font-family="${FONT}">
  <text x="140" y="40" font-size="24" font-weight="bold">ER-діаграма бази даних — «Облік робочого часу працівників»</text>
  <rect x="140" y="1010" width="18" height="14" fill="#dae8fc" stroke="#000"/>
  <text x="166" y="1022" font-size="13">— таблиця (сутність)</text>
  <line x1="380" y1="1017" x2="430" y2="1017" stroke="#333" stroke-width="1.4" marker-end="url(#crow)"/>
  <text x="440" y="1022" font-size="13">— зв'язок 1:M (суцільна лінія)</text>
  <line x1="780" y1="1017" x2="830" y2="1017" stroke="#8a1f1f" stroke-width="1.4" stroke-dasharray="6,4" marker-end="url(#crow)"/>
  <text x="840" y="1022" font-size="13">— зв'язок 1:1 (department ↔ manager)</text>
  <text x="1350" y="1022" font-size="13" font-weight="bold">PK</text>
  <text x="1385" y="1022" font-size="13">— первинний ключ,</text>
  <text x="1560" y="1022" font-size="13" font-weight="bold">FK</text>
  <text x="1595" y="1022" font-size="13">— зовнішній ключ,</text>
  <text x="1750" y="1022" font-size="13" font-weight="bold">UQ</text>
  <text x="1790" y="1022" font-size="13">— унікальне обмеження</text>
  <text x="2100" y="1022" font-size="13" font-style="italic">M:N — department_shift_templates, project_members</text>
  <rect x="140" y="1040" width="18" height="14" fill="${NEW_FILL}" stroke="#000"/>
  <text x="166" y="1052" font-size="13">— NEW (лаб. №6-7): projects / project_members / project_tasks</text>
</g>`;

const width = COL[5] + 300 + 150;
const height = ROW[3] + 260;

const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="#ffffff"/>
${defs}
${legend}
${svg.join("\n")}
</svg>`;

fs.writeFileSync(__dirname + "/er_diagram.svg", out);
console.log("Written er_diagram.svg", width, "x", height);
