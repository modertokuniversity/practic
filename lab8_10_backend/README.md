# Лабораторні роботи 8–10 — FastAPI backend

Окремий backend для наявного TimeTracker. Композиція працює зі своїм PostgreSQL контейнером і томом, а для ініціалізації використовує спільні перевірені SQL-файли лабораторної №5. Next.js фронтенд із `lab6_frontend` збирається як сервіс цього ж Compose-проєкту.

## Запуск

Із каталогу `lab8_10_backend`:

```powershell
docker compose up -d --build
```

Контейнери: `practice-lab8-10-db`, `practice-lab8-10-backend`, `practice-lab8-10-frontend`. Усі знаходяться в окремій мережі `practice-lab8-10-network`; дані зберігаються у томі `practice-lab8-10-db-data`.

| Сервіс | Адреса |
|---|---|
| Frontend | http://localhost:3101 |
| API | http://localhost:8100/api |
| Swagger | http://localhost:8100/docs |
| Стан API та БД | http://localhost:8100/health |
| PostgreSQL | `localhost:5434` |

Початковий користувач: `a.hnatyshak@timetrack.local`, пароль `ChangeMe123!`. Пароль задається через `DEMO_USER_PASSWORD` у `.env.example`; для локального середовища можна скопіювати файл у `.env` і задати власний секрет JWT.

Зупинити сервіси, залишивши базу даних:

```powershell
docker compose down
```

Повне скидання окремої бази:

```powershell
docker compose down -v
```

`down -v` видаляє дані контейнера лабораторної 8–10. Воно не впливає на том бази лабораторної №5.

## Реалізація

`app/routers` містить REST-маршрути, `app/schemas` — перевірку запитів, `app/services` — бізнес-логіку, `app/repositories` — доступ до БД, `app/core` — конфігурацію, підключення та JWT. Активна сесія таймера створюється ідемпотентно під час старту API, тому працює як на чистій базі, так і з наявним томом.

OpenAPI опис формується автоматично FastAPI та доступний у `/docs` і `/openapi.json`.
