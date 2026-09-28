# API_CONTRACT.md — специфікація для backend

Цей файл — не аспіраційна документація "як було б добре", а прямий знімок того, які дані фронтенд **реально використовує** (`src/lib/mock/*`, `src/lib/store.ts`, кожна сторінка `src/app/(app)/**`). Мета: щоб хтось (людина чи LLM), хто писатиме backend лаб. роботи №8 (або курсової), міг замінити `lib/mock/*` на HTTP-клієнт без повторного вивчення фронтенду. Оновлюється синхронно з кодом — якщо додається нове поле в `types.ts`, воно тут же документується.

База — реляційна схема PostgreSQL з лаб. роботи №5 (`../lab5/sql/01_schema.sql`). Розділи нижче позначають, що з неї **збігається**, що **потрібно домігрувати** (нові поля/таблиці лаб. роботи №6-7), і чого в БД лаб. роботи №5 взагалі нема (Projects/Tasks — додані суто для фронтенд-демонстрації, стиль Akiflow).

---

## 1. Сутності та поля

### 1.1 User (`users`, є в lab5, потребує міграції)

| Поле | Тип | В lab5? | Опис |
|---|---|---|---|
| `id` | int | ✅ | |
| `fullName` | string | ✅ | |
| `email` | string | ✅ | унікальний, логін |
| `role` | enum | ⚠️ | lab5 мав `employee/manager/hr_admin/admin`; **додати `accountant`** — `ALTER TYPE user_role ADD VALUE 'accountant'` |
| `departmentId` | int\|null | ✅ | FK → departments |
| `positionId` | int\|null | ✅ | FK → positions |
| `avatarColor` | string | ✅ | hex, для аватара-плашки без фото |
| `isActive` | bool | ✅ | |
| `hireDate` | string (date) | ✅ | |
| `hourlyRate` | number | 🆕 | **NEW** — вартість год. (грн/год). Призначає керівник/адмін (`canSetHourlyRate`). Мігрувати як `ALTER TABLE users ADD COLUMN hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0` |

### 1.2 TimeEntry (`time_entries`, є в lab5, потребує міграції)

| Поле | Тип | В lab5? | Опис |
|---|---|---|---|
| `id`, `userId`, `workDate`, `checkIn`, `checkOut`, `status`, `projectId`, `taskId`, `note` | — | ✅ | без змін |
| `source` | `"timer"\|"manual"` | 🆕 | **NEW** — чи створено живим таймером, чи вручну. Реалізує вимогу "лише відповідальні ролі можуть додавати записи про роботу, яка фактично не відбулася". `ALTER TABLE time_entries ADD COLUMN source VARCHAR(10) NOT NULL DEFAULT 'timer'` |
| `createdBy` | int (FK users) | 🆕 | **NEW** — хто фактично створив/відкоригував запис (для `manual` — керівник/лід, не завжди сам `userId`). `ALTER TABLE time_entries ADD COLUMN created_by INT NOT NULL REFERENCES users(id)` |
| `pauseMinutes` | int\|null | 🆕 | **NEW** — сумарна тривалість пауз усередині сесії таймера. `ADD COLUMN pause_minutes INT` |
| `lunchMinutes` | int\|null | 🆕 | **NEW** — сумарна тривалість обіду усередині сесії таймера. `ADD COLUMN lunch_minutes INT` |

**Сегменти таймера НЕ зберігаються окремою таблицею** — фронтенд тримає їх лише в оперативній пам'яті сесії (`store.timer.segments`, див. `src/lib/timer.ts`) і на `stopTimer()` згортає в один рядок `time_entries` із підсумковими `pauseMinutes`/`lunchMinutes`. Якщо backend повинен показувати "живу" паузу іншим користувачам (не лише власнику сесії) — знадобиться окрема таблиця `timer_segments(id, time_entry_draft_id, type, started_at, ended_at)` і WebSocket/polling; наразі це поза межами лаб. роботи №6-7.

### 1.3 Project (🆕 нова сутність, НЕМАЄ в lab5)

| Поле | Тип | Опис |
|---|---|---|
| `id` | int | |
| `name` | string | |
| `clientName` | string | |
| `color` | string (hex) | для міток у UI |
| `status` | `"planning"\|"active"\|"on_hold"\|"completed"` | |
| `departmentId` | int (FK departments) | |
| `budgetHours` | number | плановий бюджет годин |
| `leadId` | int (FK users) | **технічно відповідальна особа** — має право на ручні записи часу по цьому проєкту (`canManageTimeEntryFor`) |
| `memberIds` | int[] | призначені виконавці — саме тут реалізовано "керівник обирає, хто над яким проєктом працює" |
| `startDate` | string (date) | |
| `deadline` | string (date) \| null | |
| `description` | string | |

Пропонована таблиця:
```sql
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  client_name VARCHAR(200) NOT NULL,
  color VARCHAR(7) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'planning',
  department_id INT NOT NULL REFERENCES departments(id),
  budget_hours NUMERIC(10,1) NOT NULL,
  lead_id INT NOT NULL REFERENCES users(id),
  start_date DATE NOT NULL,
  deadline DATE,
  description TEXT
);
CREATE TABLE project_members (
  project_id INT REFERENCES projects(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, user_id)
);
```

### 1.4 ProjectTask (🆕 нова сутність, НЕМАЄ в lab5)

| Поле | Тип | Опис |
|---|---|---|
| `id`, `projectId`, `title`, `assigneeId`, `dueDate`, `estimateMinutes` | — | без особливостей |
| `status` | `"todo"\|"in_progress"\|"done"` | керує виконавець задачі або керівник/адмін |
| `priority` | `"low"\|"medium"\|"high"\|"urgent"` | 🆕 `urgent` додано в цьому турі; змінює лише керівник/адмін (`canChangeTaskPriority`) — планувальне рішення |

### 1.5 ReportRecord (`report_records`, є в lab5, потребує міграції enum)

Без змін структури, окрім значення `type`:

| `type` | В lab5? | Опис |
|---|---|---|
| `attendance_summary`, `lateness_summary`, `leave_summary`, `department_summary` | ✅ | |
| `payroll_cost_summary` | 🆕 | **NEW** — звіт бухгалтера "Оплата праці". `ALTER TYPE report_type ADD VALUE 'payroll_cost_summary'` |

### 1.6 AppNotification — нові типи

`project_assigned`, `task_priority_changed` додано до `notification_type` enum поряд з наявними в lab5 (`leave_status_changed`, `late_alert`, `schedule_published`, `missing_checkout`, `system`).

---

## 2. Матриця прав доступу

Джерело правди на фронтенді — `src/lib/permissions.ts` (кожна функція = один рядок нижче). **Backend зобов'язаний перевіряти ці ж правила на кожному запиті** — фронтенд лише ховає кнопки для UX, це не захист.

| Дія | employee | manager | hr_admin | admin | accountant |
|---|:---:|:---:|:---:|:---:|:---:|
| Запуск/зупинка власного таймера | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ручний/заднім числом запис часу — **свій** | ❌ | ✅ | ❌ | ✅ | ❌ |
| Ручний запис часу — **чужий**, у проєкті де лід | ✅ (якщо лід проєкту) | ✅ | ❌ | ✅ | ❌ |
| Редагувати/видалити чужий запис часу | ❌ | ✅ | ❌ | ✅ | ❌ |
| Переглядати табель інших | ❌ | ✅ (свій підрозділ) | ✅ (усі) | ✅ (усі) | ❌ |
| Створити проєкт | ❌ | ✅ | ❌ | ✅ | ❌ |
| Редагувати проєкт | ❌ | ✅ (свій підрозділ) | ❌ | ✅ | ❌ |
| Призначати учасників/ліда проєкту | ❌ | ✅ | ❌ | ✅ | ❌ |
| Змінювати пріоритет задачі | ❌ | ✅ | ❌ | ✅ | ❌ |
| Змінювати статус задачі | ✅ (своєї) | ✅ | ❌ | ✅ | ❌ |
| Призначати ставку год. (`hourlyRate`) | ❌ | ✅ | ❌ | ✅ | ❌ |
| Переглядати розділ "Команда" | ❌ | ✅ | ✅ | ✅ | ❌ |
| Переглядати розділ "Звіти й аналітика" | ❌ | ✅ | ✅ | ✅ | ❌ |
| Переглядати розділ "Оплата праці" | ❌ | ✅ | ❌ | ✅ | ✅ |
| Бачити фінансові показники (собівартість проєкту) | ❌ | ✅ | ❌ | ✅ | ✅ |
| Затверджувати заявки на відпустку | ❌ | ✅ (свій підрозділ) | ✅ | ✅ | ❌ |

---

## 3. Дані й ендпоїнти по сторінках

Формат кожного пункту: **сторінка → що читає → що пише → ролі → REST-ендпоїнти (пропоновані)**.

### `/` — Дашборд
- Читає: `timeEntries` (7 днів, скоуп — свій запис або весь підрозділ для manager/hr/admin), `leaveRequests` (pending), `tasks` (свої, якщо employee), `departments` (breakdown годин), `timer` (стан).
- Ролі: усі, вміст різниться (`isManagerLike`).
- `GET /api/dashboard/summary?scope=me|department` → `{ weeklyHours, checkedInNow[], lateThisWeek[], pendingLeave[], myTasks[] }` — один агрегований ендпоїнт, щоб не робити 5 запитів на кожен віджет.

### `/tracker` — Таймер
- Читає: `projects` (активні, для селекту), `tasksByProject`, `timer` (поточний сегментний стан), `timeEntries` (сьогоднішні свої).
- Пише: `POST /api/timer/start {projectId, taskId, note}`, `POST /api/timer/pause`, `POST /api/timer/resume`, `POST /api/timer/lunch/start`, `POST /api/timer/lunch/end`, `POST /api/timer/stop` → створює `TimeEntry` з `pauseMinutes`/`lunchMinutes`, `source: "timer"`. `POST /api/time-entries` (`source: "manual"`) — лише якщо `canCreateAnyManualEntry`.
- Ролі: таймер — усі; ручний запис — `canManageTimeEntryFor`.
- **Примітка backend-дизайну**: стан активного таймера варто тримати server-side (в БД чи Redis, ключ `userId`), щоб таймер не губився при закритті вкладки — зараз (мок) він живе лише в `localStorage` клієнта.

### `/timesheet` — Табель
- Читає: `timeEntries` (з фільтрами: період/працівник/статус, скоуп — свій або весь підрозділ/компанія), `projects`.
- Пише: `PATCH /api/time-entries/:id`, `DELETE /api/time-entries/:id` — обидва **лише якщо** `canManageTimeEntryFor(currentUser, entry.projectId)` на сервері.
- `GET /api/time-entries?from=&to=&userId=&status=&page=` → пагінований список.
- Ролі: перегляд свого — усі; перегляд/редагування чужого — `canManageOthersTimesheet` / `canManageTimeEntryFor`.

### `/projects` — Список проєктів
- Читає: `GET /api/projects` → `Project[]` зі `stats` (done/total tasks, actualHours — можна порахувати на сервері одним JOIN, а не тягнути всі time_entries на клієнт).
- Пише: `POST /api/projects {name, clientName, departmentId, budgetHours, leadId, memberIds[], color, description, deadline}` — лише `canManageProjects`.
- Ролі: перегляд — усі; створення — manager/admin.

### `/projects/[id]` — Деталі проєкту
- Читає: `GET /api/projects/:id` (включно з `memberIds`→розгорнутими `User[]`), `GET /api/projects/:id/tasks`, і аналітичні агрегати нижче.
- Пише: `PATCH /api/projects/:id` (редагування, `canEditProject`), `PATCH /api/tasks/:id/priority` (`canChangeTaskPriority`), `PATCH /api/tasks/:id/status` (`canChangeTaskStatus`).
- **Аналітичні ендпоїнти** (зараз рахуються на клієнті функціями `stats.ts` — на backend варто перенести в SQL-агрегати, щоб не ганяти всі time_entries):
  - `GET /api/projects/:id/analytics/time-series?days=14` → `{date, hours}[]` (динаміка витраченого часу)
  - `GET /api/projects/:id/analytics/workload` → `{userId, name, hours}[]` (навантаження учасників)
  - `GET /api/projects/:id/analytics/tasks-breakdown` → `{done, inProgress, todo, total}`
  - `GET /api/projects/:id/analytics/planned-vs-actual` → `{plannedHours, actualHours}`
  - `GET /api/projects/:id/analytics/cost` → `{cost}` — лише якщо `canViewFinancials`
- Ролі: перегляд Kanban/учасників — усі учасники проєкту + керівництво; фінансові метрики — `canViewFinancials`; редагування — `canEditProject`/`canChangeTaskPriority`.

### `/team` — Команда
- Читає: `GET /api/users?departmentId=` (з `totalHoursThisWeek` — агрегат на сервері).
- Пише: `PATCH /api/users/:id/hourly-rate {rate}` — лише `canSetHourlyRate`.
- Ролі: `canViewTeamAndReports` (manager/hr_admin/admin).

### `/payroll` — Оплата праці (бухгалтер)
- Читає: `GET /api/payroll/rows?from=&to=&departmentId=&projectId=&userId=` → `PayrollRow[]` (`{user, hours, hourlyRate, cost}`) — групування "за працівниками". `GET /api/payroll/by-project?from=&to=&departmentId=` → групування "за проєктами".
- Пише: `POST /api/reports {type: "payroll_cost_summary", periodStart, periodEnd, departmentId, format}` → зберігає `ReportRecord`, повертає `id` для історії.
- Ролі: `canViewPayroll` (accountant/manager/admin). **Важливо**: це фінансові дані (вартість праці) — на backend обов'язково перевіряти роль на кожен запит, не лише ховати пункт меню.

### `/reports` — Звіти й аналітика (загальні)
- Читає: `GET /api/analytics/department-hours`, `GET /api/analytics/lateness-trend?days=7`, `GET /api/leave-requests/by-type`.
- Пише: `POST /api/reports {type, departmentId, periodStart, periodEnd, format}`.
- Ролі: `canViewTeamAndReports`.

### `/schedule`, `/leave`, `/notifications`, `/settings`
Без істотних змін відносно лаб. роботи №5 — стандартні CRUD над `schedules`/`leave_requests`/`notifications`, ендпоїнти відповідають наявним таблицям 1:1 (`GET/POST /api/schedules`, `GET/POST/PATCH /api/leave-requests`, `GET/PATCH /api/notifications`).

---

## 4. Пропоновані REST-ендпоїнти (зведений список)

```
GET    /api/dashboard/summary
POST   /api/timer/start | pause | resume | lunch/start | lunch/end | stop
GET    /api/time-entries
POST   /api/time-entries
PATCH  /api/time-entries/:id
DELETE /api/time-entries/:id
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
GET    /api/projects/:id/tasks
PATCH  /api/tasks/:id/status
PATCH  /api/tasks/:id/priority
GET    /api/projects/:id/analytics/time-series
GET    /api/projects/:id/analytics/workload
GET    /api/projects/:id/analytics/tasks-breakdown
GET    /api/projects/:id/analytics/planned-vs-actual
GET    /api/projects/:id/analytics/cost
GET    /api/users
PATCH  /api/users/:id/hourly-rate
GET    /api/payroll/rows
GET    /api/payroll/by-project
GET    /api/analytics/department-hours
GET    /api/analytics/lateness-trend
GET    /api/leave-requests | POST | PATCH /:id
GET    /api/schedules
GET/PATCH /api/notifications
POST   /api/reports
GET    /api/reports
```

Кожен ендпоїнт, що змінює дані (`POST`/`PATCH`/`DELETE`), повинен на сервері повторно перевірити відповідний рядок матриці прав у розділі 2 — не покладатися на те, що фронтенд уже приховав кнопку.
