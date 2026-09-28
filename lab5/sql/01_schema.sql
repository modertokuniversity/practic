-- =====================================================================
-- Лабораторна робота №5 — Проєктування бази даних програмної системи
-- Тема проєкту: Вебзастосунок для обліку робочого часу працівників
-- СУБД: PostgreSQL 15+
-- Автор: Гнатишак Андрій, гр. ІПЗ-41
-- =====================================================================
-- Файл: 01_schema.sql
-- Призначення: DDL — створення всіх таблиць, ключів, обмежень, індексів
--              та звітних представлень (views).
--
-- Версія 2 (синхронізовано з лаб. роботою №6-7, фронтенд-frontend):
-- під час розробки фронтенду (Next.js, mock-дані в src/lib/mock/*) виникли
-- нові сутності й поля — облік проєктів/задач, вартість години працівника,
-- роль "бухгалтер", розбивка сесії таймера на паузу/обід. Ця версія схеми
-- переносить усі ці зміни в реальну базу даних, щоб схема лишалась єдиним
-- джерелом правди для всього курсового проєкту (лаб. №4-8). Нові сутності
-- й поля позначені коментарем "NEW (лаб. №6-7)".
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Розширення та власні типи (ENUM)
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- для gen_random_uuid(), якщо знадобиться

CREATE TYPE user_role AS ENUM (
    'employee',      -- рядовий працівник
    'manager',        -- керівник підрозділу
    'hr_admin',       -- HR-адміністратор
    'admin',          -- адміністратор системи
    'accountant'      -- NEW (лаб. №6-7): бухгалтер — звіти по оплаті праці
);

CREATE TYPE time_entry_status AS ENUM (
    'in_progress',    -- працівник відмітив прихід, ще не відмітив відхід
    'completed',      -- зміна завершена штатно
    'edited',         -- запис відкориговано вручну (керівником/адміністратором)
    'missing_checkout' -- відхід не зафіксовано (наприклад, забув відмітитись)
);

CREATE TYPE schedule_status AS ENUM (
    'planned',        -- заплановано
    'confirmed',      -- підтверджено керівником
    'cancelled'        -- скасовано
);

CREATE TYPE leave_request_status AS ENUM (
    'pending',        -- очікує розгляду
    'approved',       -- затверджено
    'rejected',       -- відхилено
    'cancelled'        -- скасовано самим працівником
);

CREATE TYPE notification_type AS ENUM (
    'leave_status_changed',
    'late_alert',
    'schedule_published',
    'missing_checkout',
    'system',
    'project_assigned',      -- NEW (лаб. №6-7): працівника призначено на проєкт
    'task_priority_changed'  -- NEW (лаб. №6-7): змінено пріоритет задачі
);

CREATE TYPE report_type AS ENUM (
    'attendance_summary',   -- зведений звіт по відпрацьованому часу
    'lateness_summary',     -- звіт про запізнення
    'leave_summary',        -- звіт по відпустках/лікарняних
    'department_summary',   -- загальний звіт по підрозділу
    'payroll_cost_summary'  -- NEW (лаб. №6-7): звіт бухгалтера "Оплата праці"
);

-- NEW (лаб. №6-7) — статуси й пріоритети проєктів/задач
CREATE TYPE project_status AS ENUM (
    'planning',       -- узгодження вимог, ще не розпочато
    'active',         -- у роботі
    'on_hold',        -- призупинено
    'completed'       -- завершено
);

CREATE TYPE task_status AS ENUM (
    'todo',
    'in_progress',
    'done'
);

CREATE TYPE task_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);

-- ---------------------------------------------------------------------
-- 1. departments — підрозділи компанії
-- ---------------------------------------------------------------------
CREATE TABLE departments (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    manager_id  INTEGER,                 -- FK -> users.id додається нижче (ALTER),
                                          -- бо users ще не створена (циклічна залежність)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE departments IS 'Підрозділи (відділи) підприємства';
COMMENT ON COLUMN departments.manager_id IS 'Керівник підрозділу (1:1, необов''язковий) — посилання на users.id';

-- ---------------------------------------------------------------------
-- 2. positions — посади (довідник, спільний для всіх підрозділів)
-- ---------------------------------------------------------------------
CREATE TABLE positions (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(120) NOT NULL UNIQUE,
    description TEXT
);
COMMENT ON TABLE positions IS 'Довідник посад працівників';

-- ---------------------------------------------------------------------
-- 3. users — користувачі системи (усі ролі)
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id             SERIAL PRIMARY KEY,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    full_name      VARCHAR(200) NOT NULL,
    role           user_role NOT NULL DEFAULT 'employee',
    department_id  INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    position_id    INTEGER REFERENCES positions(id) ON DELETE SET NULL,
    phone          VARCHAR(30),
    hire_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    hourly_rate    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (hourly_rate >= 0),  -- NEW (лаб. №6-7)
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE users IS 'Користувачі системи: працівники, керівники, HR- та системні адміністратори, бухгалтер';
COMMENT ON COLUMN users.role IS 'Роль користувача визначає набір доступних функцій системи';
COMMENT ON COLUMN users.hourly_rate IS
    'NEW (лаб. №6-7): вартість години працівника (грн/год) — призначає керівник/адмін, '
    'використовується для розрахунку собівартості проєкту й звіту "Оплата праці"';

-- тепер, коли users існує, додаємо відкладений зовнішній ключ для departments.manager_id
ALTER TABLE departments
    ADD CONSTRAINT fk_departments_manager
        FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT uq_departments_manager UNIQUE (manager_id);  -- 1 користувач очолює максимум 1 підрозділ

-- ---------------------------------------------------------------------
-- 4. shift_templates — шаблони змін (довідник, спільний для компанії)
-- ---------------------------------------------------------------------
CREATE TABLE shift_templates (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,        -- напр. "Ранкова", "Денна", "Нічна"
    start_time    TIME NOT NULL,
    end_time      TIME NOT NULL,                -- може бути < start_time (нічна зміна через північ)
    break_minutes SMALLINT NOT NULL DEFAULT 0 CHECK (break_minutes >= 0),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE shift_templates IS 'Шаблони робочих змін (можуть використовуватись кількома підрозділами)';
COMMENT ON COLUMN shift_templates.end_time IS 'Якщо end_time < start_time — зміна нічна, триває через північ';

-- ---------------------------------------------------------------------
-- 5. department_shift_templates — зв'язуюча таблиця M:N
--    (які шаблони змін доступні у яких підрозділах)
-- ---------------------------------------------------------------------
CREATE TABLE department_shift_templates (
    department_id     INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    shift_template_id INTEGER NOT NULL REFERENCES shift_templates(id) ON DELETE CASCADE,
    PRIMARY KEY (department_id, shift_template_id)
);
COMMENT ON TABLE department_shift_templates IS
    'Зв''язуюча таблиця M:N: один підрозділ може використовувати кілька шаблонів змін, '
    'і один шаблон може застосовуватись у кількох підрозділах';

-- ---------------------------------------------------------------------
-- 6. schedules — графік роботи конкретного працівника на конкретну дату
-- ---------------------------------------------------------------------
CREATE TABLE schedules (
    id                 SERIAL PRIMARY KEY,
    user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_date          DATE NOT NULL,
    shift_template_id  INTEGER REFERENCES shift_templates(id) ON DELETE SET NULL,
    planned_start      TIMESTAMPTZ NOT NULL,
    planned_end        TIMESTAMPTZ NOT NULL,
    status             schedule_status NOT NULL DEFAULT 'planned',
    created_by         INTEGER NOT NULL REFERENCES users(id),
    note               TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_schedules_user_date UNIQUE (user_id, work_date),
    CONSTRAINT chk_schedules_time CHECK (planned_end > planned_start)
);
COMMENT ON TABLE schedules IS 'Графік змін: планова присутність працівника на конкретну дату';
COMMENT ON COLUMN schedules.created_by IS 'Керівник/адміністратор, що сформував запис графіка';

-- ---------------------------------------------------------------------
-- 7. projects — проєкти компанії — NEW (лаб. №6-7)
-- ---------------------------------------------------------------------
CREATE TABLE projects (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(200) NOT NULL,
    client_name   VARCHAR(200) NOT NULL DEFAULT 'Внутрішній проєкт',
    color         VARCHAR(7) NOT NULL DEFAULT '#7C3AED',   -- hex-мітка для UI
    status        project_status NOT NULL DEFAULT 'planning',
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    budget_hours  NUMERIC(10,1) NOT NULL CHECK (budget_hours > 0),
    lead_id       INTEGER NOT NULL REFERENCES users(id),
    start_date    DATE NOT NULL,
    deadline      DATE,
    description   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_projects_deadline CHECK (deadline IS NULL OR deadline >= start_date)
);
COMMENT ON TABLE projects IS
    'NEW (лаб. №6-7): проєкти компанії, по яких ведеться облік часу. '
    'lead_id — технічно відповідальна особа, яка (поряд з керівником/адміном) '
    'має право вносити ручні записи часу по цьому проєкту.';
COMMENT ON COLUMN projects.lead_id IS 'Відповідальний за технічну частину проєкту (може створювати ручні time_entries по проєкту)';

-- ---------------------------------------------------------------------
-- 8. project_members — учасники проєкту (M:N) — NEW (лаб. №6-7)
-- ---------------------------------------------------------------------
CREATE TABLE project_members (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, user_id)
);
COMMENT ON TABLE project_members IS
    'NEW (лаб. №6-7): хто призначений працювати над проєктом — керівник обирає учасників '
    'при створенні/редагуванні проєкту.';

-- ---------------------------------------------------------------------
-- 9. project_tasks — задачі проєкту (Kanban) — NEW (лаб. №6-7)
-- ---------------------------------------------------------------------
CREATE TABLE project_tasks (
    id               SERIAL PRIMARY KEY,
    project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title            VARCHAR(300) NOT NULL,
    status           task_status NOT NULL DEFAULT 'todo',
    priority         task_priority NOT NULL DEFAULT 'medium',
    assignee_id      INTEGER NOT NULL REFERENCES users(id),
    due_date         DATE,
    estimate_minutes INTEGER CHECK (estimate_minutes IS NULL OR estimate_minutes > 0),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE project_tasks IS
    'NEW (лаб. №6-7): задачі проєкту (Kanban: todo/in_progress/done). '
    'priority змінює лише керівник/адмін; status — виконавець або керівник/адмін.';

-- ---------------------------------------------------------------------
-- 10. time_entries — фактичні відмітки часу (чекін/чекаут)
-- ---------------------------------------------------------------------
CREATE TABLE time_entries (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_date      DATE NOT NULL,
    check_in       TIMESTAMPTZ NOT NULL,
    check_out      TIMESTAMPTZ,
    status         time_entry_status NOT NULL DEFAULT 'in_progress',
    source         VARCHAR(20) NOT NULL DEFAULT 'timer'
                       CHECK (source IN ('timer', 'manual')),   -- CHANGED (лаб. №6-7): було 'web'/'mobile'/'manual'
    project_id     INTEGER REFERENCES projects(id) ON DELETE SET NULL,       -- NEW (лаб. №6-7)
    task_id        INTEGER REFERENCES project_tasks(id) ON DELETE SET NULL, -- NEW (лаб. №6-7)
    created_by     INTEGER NOT NULL REFERENCES users(id),                    -- NEW (лаб. №6-7)
    pause_minutes  INTEGER CHECK (pause_minutes IS NULL OR pause_minutes >= 0), -- NEW (лаб. №6-7)
    lunch_minutes  INTEGER CHECK (lunch_minutes IS NULL OR lunch_minutes >= 0), -- NEW (лаб. №6-7)
    notes          TEXT,
    worked_minutes INTEGER GENERATED ALWAYS AS (
                       CASE WHEN check_out IS NOT NULL
                            THEN GREATEST(0, ROUND(EXTRACT(EPOCH FROM (check_out - check_in)) / 60))::INTEGER
                            ELSE NULL
                       END
                   ) STORED,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_time_entries_order CHECK (check_out IS NULL OR check_out > check_in)
);
COMMENT ON TABLE time_entries IS 'Фактичні відмітки початку/завершення робочого дня (чекін/чекаут)';
COMMENT ON COLUMN time_entries.worked_minutes IS 'Обчислюється автоматично (GENERATED) як різниця check_out - check_in у хвилинах (включно з паузою/обідом — worked_minutes не віднімає pause/lunch, це "валовий" час сесії)';
COMMENT ON COLUMN time_entries.source IS
    'NEW (лаб. №6-7): "timer" — створено через живий таймер (чесний трек), '
    '"manual" — внесено заднім числом відповідальною особою (керівник/адмін/лід проєкту). '
    'Саме це поле реалізує вимогу "додавати записи про роботу, яка фактично не відбулася, можуть лише відповідальні ролі".';
COMMENT ON COLUMN time_entries.created_by IS 'NEW (лаб. №6-7): хто фактично створив запис — для source=manual зазвичай НЕ дорівнює user_id (керівник коригує запис підлеглого)';
COMMENT ON COLUMN time_entries.pause_minutes IS 'NEW (лаб. №6-7): сумарна тривалість пауз усередині сесії таймера';
COMMENT ON COLUMN time_entries.lunch_minutes IS 'NEW (лаб. №6-7): сумарна тривалість обідньої перерви усередині сесії таймера';

-- ---------------------------------------------------------------------
-- 11. leave_types — довідник типів відпусток/лікарняних
-- ---------------------------------------------------------------------
CREATE TABLE leave_types (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(100) NOT NULL UNIQUE,   -- Щорічна відпустка, Лікарняний, Відгул...
    is_paid           BOOLEAN NOT NULL DEFAULT TRUE,
    annual_limit_days SMALLINT                         -- NULL = без ліміту (напр. лікарняний)
);
COMMENT ON TABLE leave_types IS 'Довідник типів відсутності: відпустка, лікарняний, відгул тощо';

-- ---------------------------------------------------------------------
-- 12. leave_requests — заявки на відпустку/лікарняний
-- ---------------------------------------------------------------------
CREATE TABLE leave_requests (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type_id INTEGER NOT NULL REFERENCES leave_types(id),
    start_date    DATE NOT NULL,
    end_date      DATE NOT NULL,
    days_count    INTEGER GENERATED ALWAYS AS ((end_date - start_date) + 1) STORED,
    reason        TEXT,
    status        leave_request_status NOT NULL DEFAULT 'pending',
    approver_id   INTEGER REFERENCES users(id),
    approved_at   TIMESTAMPTZ,
    comment       TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_leave_requests_dates CHECK (end_date >= start_date)
);
COMMENT ON TABLE leave_requests IS 'Заявки працівників на відпустку / лікарняний / відгул';
COMMENT ON COLUMN leave_requests.days_count IS 'Кількість календарних днів заявки (обчислюється автоматично)';

-- ---------------------------------------------------------------------
-- 13. leave_balances — залишок днів відпустки по роках
-- ---------------------------------------------------------------------
CREATE TABLE leave_balances (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type_id INTEGER NOT NULL REFERENCES leave_types(id),
    year          SMALLINT NOT NULL,
    total_days    NUMERIC(5,1) NOT NULL DEFAULT 0 CHECK (total_days >= 0),
    used_days     NUMERIC(5,1) NOT NULL DEFAULT 0 CHECK (used_days >= 0),
    CONSTRAINT uq_leave_balances UNIQUE (user_id, leave_type_id, year)
);
COMMENT ON TABLE leave_balances IS 'Річний ліміт і використані дні відпустки/лікарняного на працівника';

-- ---------------------------------------------------------------------
-- 14. holidays — довідник святкових/неробочих днів
-- ---------------------------------------------------------------------
CREATE TABLE holidays (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(150) NOT NULL,
    holiday_date     DATE NOT NULL,
    is_recurring     BOOLEAN NOT NULL DEFAULT FALSE,  -- повторюється щороку в ту саму дату
    CONSTRAINT uq_holidays_date UNIQUE (holiday_date)
);
COMMENT ON TABLE holidays IS 'Державні свята та неробочі дні — використовується звітами для коректного розрахунку робочого часу';

-- ---------------------------------------------------------------------
-- 15. notifications — сповіщення користувачів
-- ---------------------------------------------------------------------
CREATE TABLE notifications (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type              notification_type NOT NULL,
    title             VARCHAR(200) NOT NULL,
    message           TEXT NOT NULL,
    related_entity    VARCHAR(50),     -- напр. 'leave_request', 'time_entry', 'project'
    related_entity_id INTEGER,
    is_read           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at           TIMESTAMPTZ
);
COMMENT ON TABLE notifications IS 'Сповіщення користувачів (email / у застосунку / WebSocket)';

-- ---------------------------------------------------------------------
-- 16. audit_log — журнал аудиту змін (для адміністратора)
-- ---------------------------------------------------------------------
CREATE TABLE audit_log (
    id          BIGSERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- NULL = дія системи
    action      VARCHAR(50) NOT NULL,     -- INSERT / UPDATE / DELETE / LOGIN / APPROVE ...
    entity_type VARCHAR(50) NOT NULL,     -- назва таблиці/сутності
    entity_id   INTEGER,
    old_value   JSONB,
    new_value   JSONB,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE audit_log IS 'Універсальний журнал історії змін для будь-якої сутності системи (для адміністратора)';

-- ---------------------------------------------------------------------
-- 17. reports — метадані сформованих звітів
-- ---------------------------------------------------------------------
CREATE TABLE reports (
    id            SERIAL PRIMARY KEY,
    report_type   report_type NOT NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,  -- NULL = звіт по всій компанії
    period_start  DATE NOT NULL,
    period_end    DATE NOT NULL,
    generated_by  INTEGER NOT NULL REFERENCES users(id),
    file_url      VARCHAR(500),          -- шлях/посилання на згенерований PDF/Excel
    parameters    JSONB,                 -- додаткові параметри формування звіту
    generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_reports_period CHECK (period_end >= period_start)
);
COMMENT ON TABLE reports IS 'Історія сформованих (у т.ч. автоматичних) звітів';

-- =====================================================================
-- ІНДЕКСИ
-- =====================================================================
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_schedules_work_date ON schedules(work_date);
CREATE INDEX idx_schedules_user ON schedules(user_id, work_date);

CREATE INDEX idx_projects_department ON projects(department_id);   -- NEW (лаб. №6-7)
CREATE INDEX idx_projects_lead ON projects(lead_id);                -- NEW (лаб. №6-7)
CREATE INDEX idx_projects_status ON projects(status);                -- NEW (лаб. №6-7)
CREATE INDEX idx_project_members_user ON project_members(user_id);   -- NEW (лаб. №6-7)
CREATE INDEX idx_project_tasks_project ON project_tasks(project_id, status); -- NEW (лаб. №6-7)
CREATE INDEX idx_project_tasks_assignee ON project_tasks(assignee_id);      -- NEW (лаб. №6-7)

CREATE INDEX idx_time_entries_user_date ON time_entries(user_id, work_date);
CREATE INDEX idx_time_entries_work_date ON time_entries(work_date);
CREATE INDEX idx_time_entries_project ON time_entries(project_id) WHERE project_id IS NOT NULL; -- NEW (лаб. №6-7)
-- часткові індекси — для dashboard "хто зараз на роботі" та "хто забув відмітитись"
CREATE INDEX idx_time_entries_open ON time_entries(user_id) WHERE check_out IS NULL;

CREATE INDEX idx_leave_requests_user_status ON leave_requests(user_id, status);
CREATE INDEX idx_leave_requests_status_dates ON leave_requests(status, start_date);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

CREATE INDEX idx_reports_department_period ON reports(department_id, period_start, period_end);

-- =====================================================================
-- TRIGGER: автоматичне оновлення updated_at
-- =====================================================================
CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TRIGGER set_updated_at_time_entries
    BEFORE UPDATE ON time_entries
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TRIGGER set_updated_at_leave_requests
    BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TRIGGER set_updated_at_projects           -- NEW (лаб. №6-7)
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TRIGGER set_updated_at_project_tasks      -- NEW (лаб. №6-7)
    BEFORE UPDATE ON project_tasks
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- =====================================================================
-- ЗВІТНІ ПРЕДСТАВЛЕННЯ (VIEWS) — основа для майбутнього frontend-дашборду
-- =====================================================================

-- 1) Деталізація кожної відмітки часу разом із запізненням відносно графіка
CREATE VIEW v_time_entry_details AS
SELECT
    te.id                AS time_entry_id,
    te.user_id,
    u.full_name,
    u.department_id,
    d.name               AS department_name,
    te.work_date,
    te.check_in,
    te.check_out,
    te.worked_minutes,
    s.planned_start,
    s.planned_end,
    GREATEST(0, ROUND(EXTRACT(EPOCH FROM (te.check_in - s.planned_start)) / 60))::INTEGER AS late_minutes,
    (te.check_in > s.planned_start)                                                       AS is_late,
    te.status
FROM time_entries te
JOIN users u        ON u.id = te.user_id
LEFT JOIN departments d ON d.id = u.department_id
LEFT JOIN schedules s   ON s.user_id = te.user_id AND s.work_date = te.work_date;

COMMENT ON VIEW v_time_entry_details IS
    'Кожна відмітка часу разом з інформацією про запізнення відносно планового графіка — '
    'основа для дашборду та звіту по запізненнях';

-- 2) Денна зведена статистика по підрозділах (для dashboard-графіків)
CREATE VIEW v_daily_department_summary AS
SELECT
    d.id                                    AS department_id,
    d.name                                  AS department_name,
    te.work_date,
    COUNT(*)                                AS entries_count,
    COUNT(*) FILTER (WHERE te.check_in IS NOT NULL AND
                            te.check_in > COALESCE(s.planned_start, te.check_in)) AS late_count,
    ROUND(AVG(te.worked_minutes) / 60.0, 2) AS avg_worked_hours,
    SUM(te.worked_minutes)                  AS total_worked_minutes
FROM time_entries te
JOIN users u ON u.id = te.user_id
JOIN departments d ON d.id = u.department_id
LEFT JOIN schedules s ON s.user_id = te.user_id AND s.work_date = te.work_date
GROUP BY d.id, d.name, te.work_date;

COMMENT ON VIEW v_daily_department_summary IS
    'Агрегована статистика по підрозділах за кожен день — джерело для графіків на dashboard';

-- 3) Залишок відпустки/лікарняного на поточний рік
CREATE VIEW v_leave_balance_current AS
SELECT
    lb.user_id,
    u.full_name,
    lt.name          AS leave_type,
    lb.year,
    lb.total_days,
    lb.used_days,
    (lb.total_days - lb.used_days) AS remaining_days
FROM leave_balances lb
JOIN users u        ON u.id = lb.user_id
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT;

COMMENT ON VIEW v_leave_balance_current IS 'Залишок днів відпустки/лікарняного працівників на поточний рік';

-- 4) Черга заявок, що очікують затвердження (для менеджерського dashboard)
CREATE VIEW v_pending_leave_requests AS
SELECT
    lr.id,
    lr.user_id,
    u.full_name,
    u.department_id,
    d.name          AS department_name,
    lt.name         AS leave_type,
    lr.start_date,
    lr.end_date,
    lr.days_count,
    lr.created_at
FROM leave_requests lr
JOIN users u        ON u.id = lr.user_id
LEFT JOIN departments d ON d.id = u.department_id
JOIN leave_types lt ON lt.id = lr.leave_type_id
WHERE lr.status = 'pending'
ORDER BY lr.created_at;

COMMENT ON VIEW v_pending_leave_requests IS 'Заявки, що очікують розгляду керівником — черга для dashboard менеджера';

-- 5) Хто зараз на роботі (не відмітив відхід) — для live-dashboard
CREATE VIEW v_currently_checked_in AS
SELECT
    te.id AS time_entry_id,
    u.id  AS user_id,
    u.full_name,
    d.name AS department_name,
    te.check_in
FROM time_entries te
JOIN users u ON u.id = te.user_id
LEFT JOIN departments d ON d.id = u.department_id
WHERE te.check_out IS NULL;

COMMENT ON VIEW v_currently_checked_in IS 'Працівники, які зараз на роботі (відмітили прихід, ще не відмітили відхід)';

-- 6) NEW (лаб. №6-7): зведена картка проєкту — прогрес задач, факт/план годин, команда
--    Три підзапити (задачі / учасники / факт. час) агрегуються ОКРЕМО перед JOIN —
--    інакше пряме з'єднання трьох таблиць "один-до-багатьох" одразу дає fan-out
--    (декартів добуток рядків задач × учасників × записів часу) і SUM/COUNT
--    рахують одні й ті самі значення в багато разів більше, ніж треба.
CREATE VIEW v_project_summary AS
SELECT
    p.id                          AS project_id,
    p.name                        AS project_name,
    p.status,
    p.budget_hours,
    COALESCE(t.tasks_total, 0)    AS tasks_total,
    COALESCE(t.tasks_done, 0)     AS tasks_done,
    COALESCE(m.team_size, 0)      AS team_size,
    COALESCE(e.actual_hours, 0)   AS actual_hours,
    COALESCE(t.planned_hours, 0)  AS planned_hours
FROM projects p
LEFT JOIN (
    SELECT project_id,
           COUNT(*)                                        AS tasks_total,
           COUNT(*) FILTER (WHERE status = 'done')          AS tasks_done,
           ROUND(SUM(estimate_minutes) / 60.0, 1)           AS planned_hours
    FROM project_tasks
    GROUP BY project_id
) t ON t.project_id = p.id
LEFT JOIN (
    SELECT project_id, COUNT(*) AS team_size
    FROM project_members
    GROUP BY project_id
) m ON m.project_id = p.id
LEFT JOIN (
    SELECT project_id, ROUND(SUM(worked_minutes) / 60.0, 1) AS actual_hours
    FROM time_entries
    WHERE project_id IS NOT NULL
    GROUP BY project_id
) e ON e.project_id = p.id;

COMMENT ON VIEW v_project_summary IS
    'NEW (лаб. №6-7): зведені метрики проєкту (прогрес задач, факт/план годин, розмір команди) — '
    'основа для карток метрик на сторінці /projects/:id. Підзапити навмисно агрегують кожен '
    'зв''язок окремо, щоб уникнути fan-out при об''єднанні трьох таблиць 1:M одночасно.';

-- 7) NEW (лаб. №6-7): навантаження учасників по кожному проєкту
CREATE VIEW v_project_workload AS
SELECT
    te.project_id,
    te.user_id,
    u.full_name,
    ROUND(SUM(te.worked_minutes) / 60.0, 1) AS hours
FROM time_entries te
JOIN users u ON u.id = te.user_id
WHERE te.project_id IS NOT NULL
GROUP BY te.project_id, te.user_id, u.full_name;

COMMENT ON VIEW v_project_workload IS
    'NEW (лаб. №6-7): відпрацьовані години кожного учасника в розрізі проєкту — '
    'джерело для графіка "Навантаження учасників" на сторінці проєкту';

-- 8) NEW (лаб. №6-7): зведення по оплаті праці (усі часи; фільтр по періоду — в WHERE запиту)
CREATE VIEW v_payroll_summary AS
SELECT
    u.id                                     AS user_id,
    u.full_name,
    u.department_id,
    u.hourly_rate,
    te.work_date,
    te.project_id,
    ROUND(te.worked_minutes / 60.0, 2)                    AS hours,
    ROUND((te.worked_minutes / 60.0) * u.hourly_rate, 2)  AS cost
FROM time_entries te
JOIN users u ON u.id = te.user_id
WHERE te.worked_minutes IS NOT NULL;

COMMENT ON VIEW v_payroll_summary IS
    'NEW (лаб. №6-7): відпрацьовані години й вартість по кожному запису часу — '
    'бекенд звіту "Оплата праці" додає SUM(...)/GROUP BY й WHERE work_date BETWEEN :from AND :to '
    'поверх цього представлення (period-фільтр навмисно не "зашитий" у view).';

-- Матеріалізоване представлення — приклад для важкої місячної аналітики
-- (оновлюється періодично через REFRESH MATERIALIZED VIEW, не "на льоту")
CREATE MATERIALIZED VIEW mv_monthly_department_stats AS
SELECT
    d.id                                            AS department_id,
    d.name                                          AS department_name,
    DATE_TRUNC('month', te.work_date)::DATE         AS month,
    COUNT(DISTINCT te.user_id)                      AS active_employees,
    SUM(te.worked_minutes)                          AS total_worked_minutes,
    ROUND(AVG(te.worked_minutes) / 60.0, 2)         AS avg_worked_hours_per_entry,
    COUNT(*) FILTER (WHERE te.status = 'missing_checkout') AS missing_checkout_count
FROM time_entries te
JOIN users u ON u.id = te.user_id
JOIN departments d ON d.id = u.department_id
GROUP BY d.id, d.name, DATE_TRUNC('month', te.work_date);

CREATE UNIQUE INDEX idx_mv_monthly_department_stats
    ON mv_monthly_department_stats(department_id, month);

COMMENT ON MATERIALIZED VIEW mv_monthly_department_stats IS
    'Місячна агрегована статистика по підрозділах для звітів/дашборду. '
    'Оновлюється командою: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_department_stats;';
