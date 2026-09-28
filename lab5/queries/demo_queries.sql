-- =====================================================================
-- Файл: 03_demo_queries.sql
-- Призначення: демонстраційні запити для звіту з лабораторної роботи №5.
-- Цей файл НЕ виконується автоматично при старті контейнера
-- (не входить у /docker-entrypoint-initdb.d) — запускається вручну.
-- =====================================================================


-- ===== Запит 1. Список працівників з підрозділом і посадою (JOIN + фільтр) ====
SELECT u.id, u.full_name, u.role, d.name AS department, p.title AS position, u.hire_date
FROM users u
LEFT JOIN departments d ON d.id = u.department_id
LEFT JOIN positions   p ON p.id = u.position_id
WHERE u.is_active
ORDER BY d.name, u.full_name;


-- ===== Запит 2. Хто зараз на роботі (використання view) ========================
SELECT * FROM v_currently_checked_in ORDER BY check_in;


-- ===== Запит 3. Звіт про запізнення за період (view + фільтр) ==================
SELECT full_name, department_name, work_date, check_in, planned_start, late_minutes
FROM v_time_entry_details
WHERE is_late AND work_date BETWEEN '2026-08-31' AND '2026-09-11'
ORDER BY late_minutes DESC;


-- ===== Запит 4. Табель конкретного працівника за період =========================
SELECT work_date, check_in, check_out, worked_minutes, status
FROM time_entries
WHERE user_id = 6 AND work_date BETWEEN '2026-08-31' AND '2026-09-11'
ORDER BY work_date;


-- ===== Запит 5. Черга заявок, що очікують затвердження (view) ===================
SELECT * FROM v_pending_leave_requests;


-- ===== Запит 6. Залишок відпустки/лікарняного по працівниках (view) =============
SELECT * FROM v_leave_balance_current ORDER BY remaining_days;


-- ===== Запит 7. Денна статистика по підрозділу за тиждень (view) ================
SELECT * FROM v_daily_department_summary
WHERE department_id = 1
ORDER BY work_date;


-- ===== Запит 8. Місячна агрегована статистика (матеріалізоване представлення) ===
SELECT * FROM mv_monthly_department_stats ORDER BY month, department_name;


-- ===== Запит 9. ТОП-3 працівники за сумарним запізненням (GROUP BY + LIMIT) =====
SELECT full_name, COUNT(*) FILTER (WHERE is_late) AS late_days, SUM(late_minutes) AS total_late_minutes
FROM v_time_entry_details
GROUP BY full_name
HAVING SUM(late_minutes) > 0
ORDER BY total_late_minutes DESC
LIMIT 3;


-- ===== Запит 10. Сумарна кількість відпрацьованих годин на працівника за тиждень
SELECT u.full_name,
       ROUND(SUM(te.worked_minutes) / 60.0, 1) AS worked_hours
FROM time_entries te
JOIN users u ON u.id = te.user_id
WHERE te.work_date BETWEEN '2026-08-31' AND '2026-09-04'
GROUP BY u.full_name
ORDER BY worked_hours DESC;


-- ===== Запит 11. Заплановані на дату працівники, які НЕ відмітились (LEFT JOIN)
-- Демонструє пошук "прогулів": є графік, немає фактичної відмітки часу
SELECT s.work_date, u.full_name, d.name AS department
FROM schedules s
JOIN users u ON u.id = s.user_id
LEFT JOIN departments d ON d.id = u.department_id
LEFT JOIN time_entries te ON te.user_id = s.user_id AND te.work_date = s.work_date
WHERE te.id IS NULL
ORDER BY s.work_date;


-- ===== Запит 12. Державні свята найближчого місяця =============================
SELECT name, holiday_date
FROM holidays
WHERE holiday_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
ORDER BY holiday_date;


-- ===== Запит 13. CTE: графік vs факт по кожному працівнику Відділу розробки ====
WITH plan AS (
    SELECT user_id, COUNT(*) AS planned_days
    FROM schedules
    WHERE work_date BETWEEN '2026-08-31' AND '2026-09-11'
    GROUP BY user_id
),
fact AS (
    SELECT user_id, COUNT(*) AS actual_days
    FROM time_entries
    WHERE work_date BETWEEN '2026-08-31' AND '2026-09-11'
    GROUP BY user_id
)
SELECT u.full_name, p.planned_days, COALESCE(f.actual_days, 0) AS actual_days,
       p.planned_days - COALESCE(f.actual_days, 0) AS missed_days
FROM plan p
JOIN users u ON u.id = p.user_id
LEFT JOIN fact f ON f.user_id = p.user_id
ORDER BY missed_days DESC, u.full_name;


-- ===== Запит 14. Віконна функція: наростаючий підсумок відпрацьованих годин =====
SELECT user_id, work_date, worked_minutes,
       SUM(worked_minutes) OVER (PARTITION BY user_id ORDER BY work_date) AS running_total_minutes
FROM time_entries
WHERE user_id = 6
ORDER BY work_date;


-- ===== Запит 15. Перевірка обмеження UNIQUE (user_id, work_date) у schedules ====
-- Навмисна спроба дублювання — має завершитись помилкою "duplicate key value
-- violates unique constraint uq_schedules_user_date". Виконується в транзакції
-- з відкатом, щоб не зашкодити основним даним.
BEGIN;
INSERT INTO schedules (user_id, work_date, planned_start, planned_end, created_by)
VALUES (6, '2026-08-31', '2026-08-31 09:00+03', '2026-08-31 18:00+03', 3);
ROLLBACK;


-- =====================================================================
-- Запити 16-18 — NEW (лаб. №6-7): проєкти, задачі, оплата праці
-- =====================================================================

-- ===== Запит 16. Зведена картка кожного проєкту (view v_project_summary) =======
-- Прогрес задач, використання бюджету годин (факт/план), розмір команди.
SELECT project_name, status,
       tasks_done || '/' || tasks_total AS tasks_progress,
       actual_hours, budget_hours,
       ROUND(actual_hours / budget_hours * 100, 1) AS budget_used_pct,
       team_size
FROM v_project_summary
ORDER BY actual_hours DESC;


-- ===== Запит 17. Звіт "Оплата праці" за період, згруповано по працівниках ======
-- Це саме той запит, що живить сторінку /payroll фронтенду лаб. №6-7:
-- фільтр по періоду й підрозділу, підсумок годин і вартості на людину.
SELECT p.full_name, p.department_id,
       ROUND(SUM(v.hours), 1)  AS total_hours,
       p.hourly_rate,
       ROUND(SUM(v.cost), 2)   AS total_cost
FROM v_payroll_summary v
JOIN users p ON p.id = v.user_id
WHERE v.work_date BETWEEN '2026-08-31' AND '2026-09-11'
GROUP BY p.id, p.full_name, p.department_id, p.hourly_rate
ORDER BY total_cost DESC;


-- ===== Запит 18. Навантаження учасників конкретного проєкту (view + пріоритет) =
-- Хто скільки годин відпрацював над проєктом "TimeTracker Web" (id=1),
-- плюс кількість термінових (urgent) задач, призначених на кожного.
SELECT w.full_name, w.hours,
       COUNT(pt.id) FILTER (WHERE pt.priority = 'urgent') AS urgent_tasks
FROM v_project_workload w
LEFT JOIN project_tasks pt ON pt.project_id = w.project_id AND pt.assignee_id = w.user_id
WHERE w.project_id = 1
GROUP BY w.full_name, w.hours
ORDER BY w.hours DESC;
