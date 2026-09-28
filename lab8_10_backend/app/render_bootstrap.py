"""Initialize a fresh Render PostgreSQL database from the project's Lab 5 SQL."""

from pathlib import Path

import psycopg

from app.core.config import get_settings


def main() -> None:
    settings = get_settings()
    raw_url = settings.database_url
    if raw_url.startswith("postgresql+psycopg://"):
        raw_url = raw_url.replace("postgresql+psycopg://", "postgresql://", 1)
    elif raw_url.startswith("postgres://"):
        raw_url = raw_url.replace("postgres://", "postgresql://", 1)

    repository_root = Path(__file__).resolve().parents[2]
    sql_directory = repository_root / "lab5" / "sql"
    schema = (sql_directory / "01_schema.sql").read_text(encoding="utf-8")
    seed_data = (sql_directory / "02_seed_data.sql").read_text(encoding="utf-8")

    with psycopg.connect(raw_url) as connection:
        connection.execute("SELECT pg_advisory_xact_lock(81010)")
        initialized = connection.execute(
            "SELECT to_regclass('public.users') IS NOT NULL"
        ).fetchone()[0]
        if initialized:
            print("Render database already has the Lab 5 schema; skipping seed import.")
            return

        connection.execute(schema)
        connection.execute(seed_data)
        print("Loaded the Lab 5 schema and demo data into the Render database.")


if __name__ == "__main__":
    main()
