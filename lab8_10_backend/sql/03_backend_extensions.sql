-- Additional persistence needed by the existing frontend timer contract.
-- Core tables and demo data are loaded from 01_schema.sql and 02_seed_data.sql.
CREATE TABLE IF NOT EXISTS active_timer_sessions (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    state VARCHAR(10) NOT NULL CHECK (state IN ('work','pause','lunch')),
    state_started_at TIMESTAMPTZ NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    task_id INTEGER REFERENCES project_tasks(id) ON DELETE SET NULL,
    note TEXT,
    pause_minutes INTEGER NOT NULL DEFAULT 0 CHECK (pause_minutes >= 0),
    lunch_minutes INTEGER NOT NULL DEFAULT 0 CHECK (lunch_minutes >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
