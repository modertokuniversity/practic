# TimeTracker

Навчальний вебзастосунок для обліку робочого часу працівників. Проєкт розвивається послідовно в лабораторних роботах: від вимог та архітектури до бази даних, інтерфейсу і серверного API.

## Лабораторна робота 8–10

Backend реалізовано на **FastAPI** відповідно до клієнт-серверної та багаторівневої архітектури з лабораторної №4. Він використовує наявну схему PostgreSQL і seed-дані з `lab5/sql`, а фронтенд із `lab6_frontend` звертається до нього через REST API. API надає JWT-автентифікацію, рольову авторизацію, перевірку вхідних даних, єдиний формат помилок, аудит змін, таймер, облік часу, проєкти, задачі, відпустки, графіки й аналітику.

## Запуск усієї системи

Потрібен Docker Desktop. Із кореня репозиторію виконайте:

```powershell
cd lab5
docker compose --env-file ../lab8_10_backend/.env.example up -d --build
```

Сервіси використовують одну БД PostgreSQL, визначену в лабораторній №5:

| Компонент | Адреса |
|---|---|
| Frontend | http://localhost:3100 |
| FastAPI | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| OpenAPI JSON | http://localhost:8000/openapi.json |
| PostgreSQL | `localhost:5433`, база `timetrack` |
| pgAdmin | http://localhost:5050 |

Демонстраційні облікові записи з лабораторної №6–7: `a.hnatyshak@timetrack.local`, `i.bondarenko@timetrack.local`, `hr@timetrack.local`, `admin@timetrack.local`, `o.zakharchenko@timetrack.local`. Демонстраційний пароль задається `DEMO_USER_PASSWORD` (типово `ChangeMe123!`). Для локального використання створіть власний `.env` на основі `lab8_10_backend/.env.example` і задайте окремий `JWT_SECRET` та пароль.

Зупинити систему, зберігши дані:

```powershell
docker compose down
```

Лише для повного скидання локальної бази разом із контейнерами:

```powershell
docker compose down -v
```

Після входу інтерфейс отримує JWT від FastAPI й завантажує робочі записи, заявки, проєкти, задачі, звіти та сповіщення з PostgreSQL. Основні дії у фронтенді синхронізуються з API.

## Структура

- `lab1`–`lab4` — вимоги, аналіз та архітектурне проєктування.
- `lab5` — схема PostgreSQL, дані та Docker Compose.
- `lab6_frontend` — Next.js інтерфейс і контракт REST API.
- `lab8_10_backend` — FastAPI, валідація, JWT, бізнес-правила і документація.
