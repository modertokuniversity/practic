from contextlib import asynccontextmanager
import time

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import SessionLocal, check_database
from app.repositories.auth import replace_placeholder_demo_passwords
from app.routers import auth, dashboard, people, work


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    if len(settings.jwt_secret) < 32:
        raise RuntimeError("JWT_SECRET must contain at least 32 characters")
    last_error = None
    for _attempt in range(30):
        try:
            check_database()
            with SessionLocal() as db:
                db.execute(text("""CREATE TABLE IF NOT EXISTS active_timer_sessions (
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
                )"""))
                db.commit()
                replace_placeholder_demo_passwords(db, settings.demo_user_password)
            break
        except Exception as error:
            last_error = error
            time.sleep(2)
    else:
        raise RuntimeError(f"Database did not become ready: {last_error}") from last_error
    yield


settings = get_settings()
app = FastAPI(
    title="TimeTracker REST API",
    description="Backend для обліку робочого часу. API Layer → Business Logic → Data Access → PostgreSQL.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, allow_credentials=True,
                   allow_methods=["GET","POST","PATCH","PUT","DELETE","OPTIONS"], allow_headers=["Authorization","Content-Type"])


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    message = exc.detail if isinstance(exc.detail, str) else "Request could not be completed"
    return JSONResponse(status_code=exc.status_code, content={"status":exc.status_code,"message":message,
        "code":{400:"BAD_REQUEST",401:"UNAUTHENTICATED",403:"FORBIDDEN",404:"NOT_FOUND",409:"CONFLICT"}.get(exc.status_code,"API_ERROR")}, headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    return JSONResponse(status_code=400, content={"status":400,"message":"Request validation failed","code":"VALIDATION_ERROR",
        "details":[{"path":".".join(str(p) for p in error["loc"] if p!="body"),"message":error["msg"]} for error in exc.errors()]})


@app.exception_handler(Exception)
async def internal_error(_: Request, exc: Exception):
    import logging
    logging.getLogger("timetracker").exception("Unhandled API error", exc_info=exc)
    return JSONResponse(status_code=500,content={"status":500,"message":"Internal server error","code":"INTERNAL_ERROR"})


api = "/api"
app.include_router(auth.router, prefix=api)
app.include_router(work.router, prefix=api)
app.include_router(people.router, prefix=api)
app.include_router(dashboard.router, prefix=api)


@app.get("/health", tags=["Operations"])
def health():
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    return {"status":"ok","database":"connected"}


@app.get("/api", tags=["Operations"])
def api_index():
    return {"name":"TimeTracker API","version":"1.0.0","docs":"/docs","openapi":"/openapi.json","health":"/health"}
