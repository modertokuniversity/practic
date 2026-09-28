# Як це влаштовано (для себе та інших нейромереж)

Цей файл — технічний бриф, а не звіт для викладача. Мета: щоб будь-хто (людина чи інша LLM-сесія), яка вперше відкриє цей репозиторій, за 5 хвилин зрозуміла архітектуру, знайшла потрібний файл і не наступила на вже знайдені граблі.

## Контекст проєкту

Це фронтенд для системи обліку робочого часу, спроєктованої в лабораторних роботах №1–5 того самого курсу (`../lab1` … `../lab5`). База даних (PostgreSQL, реально піднята в Docker у `../lab5`) визначає доменну модель: `users`, `departments`, `time_entries`, `leave_requests`, `schedules` тощо. Цей фронтенд **не підключений до тієї БД** — у лаб. роботі №6-7 backend свідомо відсутній, тому вся доменна модель продубльована як TypeScript-типи (`src/lib/types.ts`) і мокові дані (`src/lib/mock/`), максимально наближені до реальної схеми (ті самі імена працівників, підрозділи, ролі — для наскрізної узгодженості між лабами).

Додатково, оскільки дизайн-референс (Akiflow) — це таск/проєкт-менеджер, до доменної моделі додано **Projects / Tasks** (яких немає в БД лаб. роботи №5) — суто для fronted-демонстрації обліку часу по проєктах у стилі Akiflow. Якщо колись підключатиметься реальний backend і потрібна повна відповідність схемі БД — ці дві сутності або мігрують у БД окремою таблицею, або приберуться.

**Розширення цього туру (лаб. робота №6-7, другий прохід):** додано рольову модель доступу (RBAC), роль "бухгалтер", сегментний таймер (робота/пауза/обід), керовані проєкти (створення, призначення учасників і ліда, вартість год.), редагований пріоритет задач, і сторінка "Оплата праці". Усі нові поля позначені коментарем `// NEW` у `src/lib/types.ts` — саме вони описані нижче й у [`API_CONTRACT.md`](./API_CONTRACT.md) як розширення для майбутнього backend.

## Стек і чому саме такий

- **Next.js 14 (App Router) + TypeScript** — вимога методички ("сучасний збирач Vite/Next.js"), плюс `output: "standalone"` дає маленький Docker-образ.
- **Tailwind CSS** — дизайн-система через `tailwind.config.ts` (кольори `brand.*`/`ink.*`, тіні `shadow-card`/`shadow-pop`).
- **Zustand** (`src/lib/store.ts`) — весь мутабельний стан застосунку в одному сторі з `persist` в `localStorage`. Свідомо не Redux/Context — для мокового CRUD без backend це найменше boilerplate.
- **Recharts** — усі графіки (`src/components/charts/`).
- **lucide-react** — іконки.

## Структура каталогів

```
src/
├── app/                        # Next.js App Router — кожна папка = маршрут
│   ├── layout.tsx              # кореневий layout, підключає шрифт Inter і StoreHydration
│   ├── globals.css             # Tailwind + дрібні глобальні стилі (скролбар, recharts)
│   ├── login/page.tsx          # /login — сторінка входу (поза (app)-групою, без Sidebar/Topbar)
│   └── (app)/                  # route group — усі "внутрішні" сторінки за спільним каркасом
│       ├── layout.tsx          # Sidebar + Topbar + <main>, тут же mobile-drawer стейт
│       ├── page.tsx            # "/" — дашборд
│       ├── tracker/page.tsx    # /tracker — живий таймер
│       ├── timesheet/page.tsx  # /timesheet — таблиця табеля з фільтрами й CRUD
│       ├── projects/page.tsx           # /projects — картки проєктів + "Новий проєкт" (manager/admin)
│       ├── projects/[id]/page.tsx      # /projects/1 — Kanban + учасники + аналітика проєкту
│       ├── payroll/page.tsx    # /payroll — звіт "Оплата праці" (accountant/manager/admin)
│       ├── schedule/page.tsx   # /schedule — календар змін (тиждень)
│       ├── leave/page.tsx      # /leave — заявки + баланс відпустки
│       ├── team/page.tsx       # /team — довідник співробітників + ставка год. (лише manager/hr/admin)
│       ├── reports/page.tsx    # /reports — аналітика + генерація звітів
│       ├── notifications/page.tsx
│       └── settings/page.tsx
├── components/
│   ├── ui/            # "дурні" перевикористовувані примітиви: Button, Card, Badge, Modal, Field (Input/Select/Textarea), Tabs, Avatar, Misc (ProgressBar/EmptyState/SectionHeading)
│   ├── layout/         # Sidebar, Topbar, RoleSwitcher, NotificationsDropdown, nav-items.ts (єдине джерело правди для пунктів меню + ролей доступу)
│   ├── charts/          # тонкі обгортки над Recharts: Weekly/Department/Donut/LineTrend (дашборд/звіти) + ProjectTime/WorkloadBar/PlannedVsActual (лише сторінка проєкту — не дублюють перші)
│   ├── dashboard/        # StatCard
│   ├── timer/            # MiniTimerPill — плашка активного таймера в Topbar (показує стан work/pause/lunch)
│   └── modals/           # TimeEntryFormModal (tracker+timesheet), ProjectEditModal (створення/редагування проєкту)
├── lib/
│   ├── types.ts        # TypeScript-дзеркало схеми БД (+ Project/Task, +NEW-поля лаб.№6-7)
│   ├── permissions.ts   # RBAC: усі перевірки прав доступу в одному місці (canManageProjects, canSetHourlyRate, canViewPayroll…)
│   ├── timer.ts          # сегментна модель таймера (TimerSegment[]: work/pause/lunch) + summarizeSegments/closeLastSegment
│   ├── store.ts           # єдиний Zustand-стор з усім мутабельним станом
│   ├── stats.ts            # чисті функції-агрегатори — і загальні (дашборд/звіти), і проєктно-скоповані (projectTimeSeries, projectWorkloadByMember, payrollRows…), щоб графіки на різних сторінках не дублювались
│   ├── utils.ts           # cn(), форматери дат/часу, toLocalISODate() (див. нижче!)
│   ├── useTicker.ts        # хук "оновлюй компонент раз/сек" — для тікання таймера
│   └── mock/
│       ├── reference.ts    # departments, positions, users (+hourlyRate), shiftTemplates, leaveTypes, holidays
│       ├── projects.ts      # 12 projects (+leadId/memberIds/дати), 46 tasks (+priority "urgent")
│       ├── attendance.ts     # ГЕНЕРАТОР schedules + timeEntries за останні 12 робочих днів + наступні 6 (детерміновано, формула як у lab5/seed_data.sql, без Math.random)
│       ├── leave.ts           # leaveRequests, leaveBalances
│       ├── notifications.ts    # notifications, auditLog, reports
│       └── index.ts             # ре-експорт усього
└── components/StoreHydration.tsx  # див. розділ "SSR і localStorage" нижче
```

## Як улаштований стан (Zustand store)

`useAppStore` (`src/lib/store.ts`) містить:

- `currentUserId` + `setCurrentUser` — "хто зараз залогінений". Перемикається через `RoleSwitcher` у Topbar (5 демо-акаунтів: employee/manager/hr_admin/admin/accountant) — так можна перевірити рольовий UI не виходячи із застосунку.
- `timer` — **сегментна модель** (`status: "idle"|"work"|"pause"|"lunch"`, `segments: TimerSegment[]`, `projectId`, `taskId`, `note`) + екшени `startTimer/pauseTimer/resumeTimer/startLunch/endLunch/stopTimer/discardTimer`. Кожен сегмент — `{type: "work"|"pause"|"lunch", startedAt, endedAt}`; перемикання стану закриває поточний сегмент (`closeLastSegment`) і відкриває новий. `summarizeSegments()` (обидва — у `src/lib/timer.ts`) рахує сумарний work/pause/lunch час, включно з ще не закритим останнім сегментом (рахує "до зараз"). При `stopTimer()` сегменти конвертуються в один `TimeEntry` із `pauseMinutes`/`lunchMinutes`.
- `timeEntries`, `leaveRequests`, `notifications`, `tasks`, `reports`, `projects` — мутабельні копії мокових масивів з CRUD-екшенами: `addManualTimeEntry`/`updateTimeEntry`/`deleteTimeEntry` (без перевірки прав у самому сторі — компонент має спершу перевірити `permissions.ts`), `addLeaveRequest`, `decideLeaveRequest`, `markNotificationRead`, `setTaskStatus`, `setTaskPriority`, `addReport`, `addProject`, `updateProject`.
- `hourlyRates: Record<userId, rate>` + `setHourlyRate` — ставка год. живе окремо від статичного довідника `users.ts` (щоб керівник міг змінювати її в рантаймі, як майбутній `PATCH /users/:id`); усі функції в `stats.ts`, що рахують вартість (`projectCost`, `payrollRows`, `payrollByProject`), приймають опційний `rates`-параметр і, якщо він переданий, використовують його замість базової ставки з довідника.

Усе це персистується в `localStorage` під ключем `timetracker-store-v2` (версія збільшена при переході на сегментний таймер — стара `v1`-структура несумісна), тож перезавантаження сторінки не скидає ні створені записи часу, ні статуси задач, ні прочитані сповіщення.

**Важливо:** статичні довідники (`departments`, `users`, `schedules`, `shiftTemplates`, `leaveTypes`) — це НЕ частина стору, вони імпортуються напряму з `lib/mock/*` де завгодно потрібні (`import { users } from "@/lib/mock/reference"`). Виняток — `projects` і `hourlyRates`: вони СЕЕДяться зі статичних масивів, але живуть у сторі, бо користувач (керівник) реально може їх змінювати (створити проєкт, змінити ставку) — сторінки мають читати їх через `useAppStore((s) => s.projects)`, а не напряму з `lib/mock/projects`, інакше нові проєкти не зʼявляться в селекторах таймера/табеля.

## Рольова модель доступу (RBAC) — `src/lib/permissions.ts`

Усі перевірки прав зведені в один модуль — єдине джерело правди, яке дублюється в [`API_CONTRACT.md`](./API_CONTRACT.md) як специфікація для backend (фронтенд-перевірки тут лише для UX, не для безпеки — реальний захист має бути на сервері). П'ять ролей: `employee`, `manager`, `hr_admin`, `admin`, `accountant`.

Ключові функції та вимоги лаб. роботи №6-7, які вони реалізують:

- `canManageTimeEntryFor(actor, projectId, projects)` — чи може `actor` створити/редагувати запис часу "заднім числом" по конкретному проєкту. `true` для керівника/адміна завжди, і для ліда проєкту (`project.leadId === actor.id`) — саме це реалізує вимогу *"додавати записи про роботу, яка фактично не відбулася, можуть лише відповідальні ролі"*. Використовується в `timesheet/page.tsx` для показу/приховування кнопок редагування/видалення в кожному рядку.
- `canCreateAnyManualEntry(actor, projects)` — чи показувати кнопку "Додати запис вручну" взагалі (керівник/адмін, або лід хоча б одного проєкту).
- `canManageProjects` / `canEditProject` — створення нових проєктів і редагування конкретного (керівник — лише свого підрозділу, адмін — усе).
- `canChangeTaskPriority` / `canChangeTaskStatus` — пріоритет змінює лише керівник/адмін (планувальне рішення), статус — сам виконавець або керівник/адмін.
- `canSetHourlyRate` — хто може редагувати ставку год. на сторінці `/team`.
- `canViewPayroll` / `canViewFinancials` — доступ до розділу "Оплата праці" і до фінансових показників (собівартість) на сторінці проєкту.

`nav-items.ts` фільтрує пункти меню за `roles?: UserRole[]`; сторінки, куди можна зайти прямим посиланням в обхід меню (`/team`, `/payroll`), самі перевіряють роль і показують заглушку "Доступ обмежено".

### SSR і localStorage (StoreHydration)

Zustand `persist` читає `localStorage` синхронно при створенні стору — але на сервері (Next.js SSR) `localStorage` не існує, а перший клієнтський рендер має БУКВАЛЬНО збігатися з серверним, інакше React кидає hydration mismatch. Рішення: `persist(..., { skipHydration: true })` у `store.ts` + компонент `StoreHydration.tsx`, який у `useEffect` (тобто вже гарантовано на клієнті, вже після першого рендеру) викликає `useAppStore.persist.rehydrate()`. До цього моменту показується короткий спінер. Якщо колись видалите `StoreHydration` з `layout.tsx` — поверне hydration-варнінги в консоль.

## Один реальний баг, який тут був — і як його розпізнати, якщо повториться

При першій генерації мокових даних усі дати ламались на один день назад для часового поясу Europe/Kyiv (UTC+3). Причина — класична пастка:

```ts
// НЕПРАВИЛЬНО:
const d = new Date();
d.setHours(0, 0, 0, 0);       // це ЛОКАЛЬНА північ
d.toISOString().slice(0, 10); // а це UTC-дата ТІЄЇ Ж миті — для UTC+3 це вже ВЧОРА за UTC
```

Виправлено функцією `toLocalISODate()` у `src/lib/utils.ts`, яка формує `YYYY-MM-DD` з `getFullYear()/getMonth()/getDate()` напряму, без переходу через UTC. **Будь-яке нове місце в коді, де потрібен "сьогоднішній день" як рядок — використовуйте `toLocalISODate()`, а не `.toISOString().slice(0,10)`.** Другий пов'язаний баг: `workedMinutes()` у `stats.ts` рахував тривалість запису без `checkOut` як "від чекіну до просто зараз" — це правильно лише для `status === "in_progress"` (сесія і справді ще триває), але для `status === "missing_checkout"` (забутий чекаут у минулому) це давало сотні "годин". Тепер `missing_checkout` повертає 0 (тривалість невідома), а не екстраполюється.

## Дизайн-система

Токени в `tailwind.config.ts`: `brand.50…900` (фіолетовий, акцент) і `ink.50…900` (нейтральні відтінки для тексту/фону/бордерів) — підібрані під референс [mozaika.design/website/akiflow](https://mozaika.design/website/akiflow) (та живий akiflow.com): фіолетовий CTA, м'які картки `rounded-2xl` з `shadow-card`, пігулки-бейджі, шрифт Inter. Компоненти в `components/ui/` — єдине місце, де ці токени фактично використовуються; на сторінках самі кольори hex не хардкодяться (окрім кольорів сутностей — `department.color`, `project.color` — це навмисно довільна палітра для візуального розрізнення карток).

## Якщо потрібно підключити реальний backend

Повна специфікація (поля сутностей, ендпоїнти, матриця прав) — окремим файлом [`API_CONTRACT.md`](./API_CONTRACT.md), який веде́ться синхронно з кодом фронтенду. Коротко, точки заміни:

1. `lib/mock/*` → замінити на API-клієнт (`src/lib/api.ts`), що ходить у FastAPI з лаб. роботи №4.
2. Екшени стору (`addManualTimeEntry`, `decideLeaveRequest`, `addProject`, `setHourlyRate` тощо) → обгорнути в `async`, що спершу шле `POST/PATCH` на бекенд і перевіряє права **на сервері** (frontend-перевірки в `permissions.ts` — лише UX, не захист), і лише після `200 OK` оновлює локальний стан.
3. `currentUserId`/`RoleSwitcher` → замінити на реальну автентифікацію (JWT з лаб. роботи №4), `RoleSwitcher` прибрати або залишити тільки для адмінів як "переглянути як інший користувач".
4. `views` з лаб. роботи №5 (`v_time_entry_details`, `v_daily_department_summary` тощо) вже рахують саме те, що зараз руками рахує `src/lib/stats.ts` — на бекенді простіше зробити ендпоїнти, що повертають готові рядки цих views, і `stats.ts` можна буде значно скоротити.
5. Нові поля з лаб. роботи №6-7 (`hourlyRate`, `leadId`/`memberIds`, `source`/`createdBy`, `pauseMinutes`/`lunchMinutes` тощо — усі позначені `// NEW` у `types.ts`) не існують у схемі лаб. роботи №5 — потрібна міграція БД, описана в `API_CONTRACT.md`.

## Відомі спрощення (свідомо, не забуті)

- Немає реальної валідації email/пароля на `/login` — будь-який ввід веде далі.
- "Завантажити звіт" у `/reports` показує toast, а "Друк / PDF" на `/payroll` викликає `window.print()` — реального генератора файлів немає, є лише метадані звіту.
- Drag-and-drop у Kanban не робили — переміщення задач через стрілки `‹ ›` (простіше, доступніше, і вистачає для демонстрації стану).
- Немає SSR/ISR-завантаження даних (усе client-side) — свідомо, бо джерело даних однаково `localStorage`, серверний рендер тут нічого не дає.
- RBAC-перевірки в `permissions.ts` — лише клієнтські (ховають кнопки/пункти меню). Це навмисне спрощення мок-фронтенду: реальний захист даних має перевіряти права на кожен запит сервер, а не довіряти клієнту.
