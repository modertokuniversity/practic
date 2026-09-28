# TimeTracker

Навчальний вебзастосунок для обліку робочого часу. Лабораторні 1–7 містять вимоги, архітектуру, схему PostgreSQL і готовий Next.js інтерфейс. Для лабораторних 8–10 додано FastAPI backend та окремий Docker Compose стек, який використовує ці схему і frontend, але запускає власні контейнери, мережу й том бази.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/modertokuniversity/practic)

### Онлайн демо (безкоштовно)

Файл `render.yaml` описує три окремі безкоштовні сервіси: FastAPI, Next.js і PostgreSQL. Під час запуску схема та демонстраційні дані завантажуються з SQL-файлів лабораторної №5. Натисніть **Deploy to Render** вище, увійдіть у Render/GitHub і підтвердьте створення Blueprint.

Перший запуск займає кілька хвилин. Безкоштовні вебсервіси засинають після 15 хвилин без запитів, тому перше відкриття після простою може тривати близько хвилини. Безкоштовна PostgreSQL у Render діє 30 днів; перед завершенням строку дані потрібно експортувати.

## Запуск стеку лабораторної 8–10

Потрібен Docker Desktop. Із кореня репозиторію:

```powershell
cd lab8_10_backend
docker compose up -d --build
```

Compose-проєкт має назву `practice-lab8-10`; контейнери: `practice-lab8-10-frontend`, `practice-lab8-10-backend`, `practice-lab8-10-db`. PostgreSQL окремий від лабораторної №5. Початкову схему й seed-дані він читає з `lab5/sql` при першому запуску свого тому.

| Компонент | Адреса |
|---|---|
| Frontend | http://localhost:3101 |
| FastAPI | http://localhost:8100 |
| Swagger UI | http://localhost:8100/docs |
| Health check | http://localhost:8100/health |
| PostgreSQL | `localhost:5434`, база `timetrack` |

Демонстраційний вхід: `a.hnatyshak@timetrack.local`, пароль `ChangeMe123!`. Інші облікові записи доступні у frontend на сторінці входу.

Compose читає `.env`, якщо він створений у `lab8_10_backend`. Для власного локального секрету скопіюйте `lab8_10_backend/.env.example` у `lab8_10_backend/.env` і замініть `JWT_SECRET` та `DEMO_USER_PASSWORD`. Без `.env` запускаються навчальні значення за замовчуванням.

Щоб зупинити тільки стек лабораторної 8–10 зі збереженням даних:

```powershell
docker compose down
```

Щоб видалити також дані цього окремого контейнерного стенду:

```powershell
docker compose down -v
```

## Структура

- `lab1`–`lab4` — вимоги, аналіз та проєктування.
- `lab5` — PostgreSQL схема та окремий Compose для лабораторної №5.
- `lab6_frontend` — Next.js інтерфейс і REST контракт.
- `lab8_10_backend` — FastAPI, звіт і автономний Compose для 8–10.
