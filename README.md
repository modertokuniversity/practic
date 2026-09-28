# TimeTracker

Навчальний вебзастосунок для обліку робочого часу. Лабораторні 1–7 містять вимоги, архітектуру, схему PostgreSQL і готовий Next.js інтерфейс. Для лабораторних 8–10 додано FastAPI backend та окремий Docker Compose стек, який використовує ці схему і frontend, але запускає власні контейнери, мережу й том бази.

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
