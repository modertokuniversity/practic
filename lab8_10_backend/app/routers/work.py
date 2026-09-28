from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.core.errors import translate_integrity_error
from app.dependencies import CurrentUser, DbSession, require_roles
from app.repositories.work import map_project, record_change, user_row
from app.schemas.domain import (HourlyRateUpdate, ProjectCreate, ProjectPatch, TaskCreate, TaskPriorityUpdate,
    TaskStatusUpdate, TimeEntryCreate, TimeEntryPatch)
from app.services.work import (create_project, create_task, create_time_entry, delete_time_entry,
    edit_time_entry, get_project, list_projects, list_tasks, list_time_entries, list_users,
    set_hourly_rate, update_project, update_task_priority, update_task_status)
from app.services import timer as timer_service
from app.schemas.common import ApiModel
from pydantic import Field

router = APIRouter(tags=["Work tracking and projects"])


class TimerStart(ApiModel):
    project_id: int | None = Field(default=None, gt=0)
    task_id: int | None = Field(default=None, gt=0)
    note: str | None = Field(default=None, max_length=2000)


@router.get("/timer")
def get_timer(db: DbSession, actor: CurrentUser):
    return timer_service.timer_state(db, actor["id"])


@router.post("/timer/start", status_code=201)
def start_timer(body: TimerStart, db: DbSession, actor: CurrentUser):
    return timer_service.start(db, actor["id"], body.project_id, body.task_id, body.note)


@router.post("/timer/pause")
def pause_timer(db: DbSession, actor: CurrentUser):
    return timer_service.transition(db, actor["id"], "pause")


@router.post("/timer/resume")
def resume_timer(db: DbSession, actor: CurrentUser):
    return timer_service.transition(db, actor["id"], "resume")


@router.post("/timer/lunch/start")
def start_lunch(db: DbSession, actor: CurrentUser):
    return timer_service.transition(db, actor["id"], "lunch/start")


@router.post("/timer/lunch/end")
def end_lunch(db: DbSession, actor: CurrentUser):
    return timer_service.transition(db, actor["id"], "lunch/end")


@router.post("/timer/stop")
def stop_timer(db: DbSession, actor: CurrentUser):
    return timer_service.stop(db, actor["id"])


@router.get("/users")
def users(db: DbSession, actor: Annotated[dict, Depends(require_roles("manager", "hr_admin", "admin"))], department_id: int | None = Query(None, alias="departmentId")):
    return list_users(db, actor, department_id)


@router.patch("/users/{user_id}/hourly-rate")
def hourly_rate(user_id: int, body: HourlyRateUpdate, db: DbSession, actor: Annotated[dict, Depends(require_roles("manager", "admin"))]):
    return set_hourly_rate(db, actor, user_id, body.rate)


@router.get("/projects")
def projects(db: DbSession, actor: CurrentUser):
    return list_projects(db, actor)


@router.post("/projects", status_code=201)
def add_project(body: ProjectCreate, db: DbSession, actor: Annotated[dict, Depends(require_roles("manager", "admin"))]):
    return create_project(db, actor, body)


@router.get("/projects/{project_id}")
def project(project_id: int, db: DbSession, actor: CurrentUser):
    return get_project(db, actor, project_id)


@router.patch("/projects/{project_id}")
def patch_project(project_id: int, body: ProjectPatch, db: DbSession, actor: Annotated[dict, Depends(require_roles("manager", "admin"))]):
    return update_project(db, actor, project_id, body.model_dump(exclude_unset=True))


@router.get("/projects/{project_id}/tasks")
def project_tasks(project_id: int, db: DbSession, actor: CurrentUser):
    return list_tasks(db, actor, project_id)


@router.post("/tasks", status_code=201)
def add_task(body: TaskCreate, db: DbSession, actor: Annotated[dict, Depends(require_roles("manager", "admin"))]):
    return create_task(db, actor, body)


@router.patch("/tasks/{task_id}/status")
def task_status(task_id: int, body: TaskStatusUpdate, db: DbSession, actor: CurrentUser):
    return update_task_status(db, actor, task_id, body.status)


@router.patch("/tasks/{task_id}/priority")
def task_priority(task_id: int, body: TaskPriorityUpdate, db: DbSession, actor: Annotated[dict, Depends(require_roles("manager", "admin"))]):
    return update_task_priority(db, actor, task_id, body.priority)


@router.get("/time-entries")
def time_entries(db: DbSession, actor: CurrentUser,
    from_date: date | None = Query(None, alias="from"), to_date: date | None = Query(None, alias="to"),
    user_id: int | None = Query(None, alias="userId", gt=0), status: Literal["in_progress","completed","edited","missing_checkout"] | None = None,
    page: int = Query(1, ge=1), page_size: int = Query(50, alias="pageSize", ge=1, le=200)):
    if from_date and to_date and from_date > to_date:
        raise HTTPException(400, "from must be on or before to")
    return list_time_entries(db, actor, from_date, to_date, user_id, status, page, page_size)


@router.post("/time-entries", status_code=201)
def add_time_entry(body: TimeEntryCreate, db: DbSession, actor: CurrentUser):
    return create_time_entry(db, actor, body)


@router.patch("/time-entries/{entry_id}")
def patch_time_entry(entry_id: int, body: TimeEntryPatch, db: DbSession, actor: CurrentUser):
    return edit_time_entry(db, actor, entry_id, body.model_dump(exclude_unset=True))


@router.delete("/time-entries/{entry_id}", status_code=204)
def remove_time_entry(entry_id: int, db: DbSession, actor: CurrentUser):
    delete_time_entry(db, actor, entry_id)
    return Response(status_code=204)


@router.get("/payroll/rows")
def payroll_rows(db: DbSession, actor: Annotated[dict, Depends(require_roles("accountant", "manager", "admin"))],
    from_date: date = Query(..., alias="from"), to_date: date = Query(..., alias="to"),
    department_id: int | None = Query(None, alias="departmentId"), project_id: int | None = Query(None, alias="projectId"),
    user_id: int | None = Query(None, alias="userId")):
    if from_date > to_date:
        raise HTTPException(400, "from must be on or before to")
    if actor["role"] == "manager":
        department_id = actor["department_id"]
    rows = db.execute(text("""SELECT u.id user_id,u.full_name,u.email,u.hourly_rate,te.project_id,
        p.name project_name,SUM(COALESCE(te.worked_minutes,0)) minutes
        FROM time_entries te JOIN users u ON u.id=te.user_id LEFT JOIN projects p ON p.id=te.project_id
        WHERE te.work_date BETWEEN :start AND :end AND te.check_out IS NOT NULL
        AND (CAST(:dept AS integer) IS NULL OR u.department_id=:dept) AND (CAST(:project AS integer) IS NULL OR te.project_id=:project)
        AND (CAST(:user AS integer) IS NULL OR u.id=:user)
        GROUP BY u.id,u.full_name,u.email,u.hourly_rate,te.project_id,p.name ORDER BY u.full_name,p.name"""),
        {"start": from_date, "end": to_date, "dept": department_id, "project": project_id, "user": user_id}).mappings()
    return [{"userId": r["user_id"], "fullName": r["full_name"], "email": r["email"], "projectId": r["project_id"],
        "projectName": r["project_name"], "hours": round(float(r["minutes"])/60, 2),
        "hourlyRate": float(r["hourly_rate"]), "cost": round(float(r["minutes"])/60*float(r["hourly_rate"]), 2)} for r in rows]


@router.get("/payroll/by-project")
def payroll_by_project(db: DbSession, actor: Annotated[dict, Depends(require_roles("accountant", "manager", "admin"))],
    from_date: date = Query(..., alias="from"), to_date: date = Query(..., alias="to"),
    department_id: int | None = Query(None, alias="departmentId")):
    if from_date > to_date:
        raise HTTPException(400, "from must be on or before to")
    if actor["role"] == "manager":
        department_id = actor["department_id"]
    rows = db.execute(text("""SELECT p.id project_id,p.name,SUM(COALESCE(te.worked_minutes,0)) minutes,
        SUM(COALESCE(te.worked_minutes,0)*u.hourly_rate/60) cost
        FROM projects p LEFT JOIN time_entries te ON te.project_id=p.id AND te.work_date BETWEEN :start AND :end
          AND te.check_out IS NOT NULL LEFT JOIN users u ON u.id=te.user_id
        WHERE (CAST(:dept AS integer) IS NULL OR p.department_id=:dept) GROUP BY p.id,p.name ORDER BY p.name"""),
        {"start": from_date, "end": to_date, "dept": department_id}).mappings()
    return [{"projectId": r["project_id"], "projectName": r["name"], "hours": round(float(r["minutes"] or 0)/60, 2), "cost": round(float(r["cost"] or 0), 2)} for r in rows]


@router.get("/projects/{project_id}/analytics/workload")
def project_workload(project_id: int, db: DbSession, actor: CurrentUser):
    get_project(db, actor, project_id)
    rows = db.execute(text("""SELECT u.id user_id,u.full_name,COALESCE(SUM(te.worked_minutes),0) minutes
        FROM project_members pm JOIN users u ON u.id=pm.user_id LEFT JOIN time_entries te ON te.project_id=pm.project_id AND te.user_id=u.id
        WHERE pm.project_id=:id GROUP BY u.id,u.full_name ORDER BY u.full_name"""), {"id": project_id}).mappings()
    return [{"userId":r["user_id"],"name":r["full_name"],"hours":round(float(r["minutes"])/60,2)} for r in rows]


@router.get("/projects/{project_id}/analytics/time-series")
def project_time_series(project_id: int, db: DbSession, actor: CurrentUser, days: int = Query(14,ge=1,le=365)):
    get_project(db, actor, project_id)
    rows = db.execute(text("""SELECT dates.day::date work_date,COALESCE(SUM(te.worked_minutes),0) minutes
        FROM generate_series(CURRENT_DATE-(:days-1),CURRENT_DATE,interval '1 day') dates(day)
        LEFT JOIN time_entries te ON te.project_id=:project AND te.work_date=dates.day::date
        GROUP BY dates.day ORDER BY dates.day"""),{"days":days,"project":project_id}).mappings()
    return [{"date":r["work_date"].isoformat(),"hours":round(float(r["minutes"])/60,2)} for r in rows]


@router.get("/projects/{project_id}/analytics/tasks-breakdown")
def project_tasks_breakdown(project_id: int, db: DbSession, actor: CurrentUser):
    get_project(db, actor, project_id)
    row = db.execute(text("""SELECT count(*) total,count(*) FILTER(WHERE status='done') done,
        count(*) FILTER(WHERE status='in_progress') in_progress,count(*) FILTER(WHERE status='todo') todo
        FROM project_tasks WHERE project_id=:id"""), {"id": project_id}).mappings().one()
    return {"done":row["done"],"inProgress":row["in_progress"],"todo":row["todo"],"total":row["total"]}


@router.get("/projects/{project_id}/analytics/planned-vs-actual")
def project_planned_actual(project_id: int, db: DbSession, actor: CurrentUser):
    project_data = get_project(db, actor, project_id)
    return {"plannedHours":project_data["budgetHours"],"actualHours":project_data["stats"]["actualHours"]}


@router.get("/projects/{project_id}/analytics/cost")
def project_cost(project_id: int, db: DbSession, actor: Annotated[dict, Depends(require_roles("accountant", "manager", "admin"))]):
    data = get_project(db, actor, project_id)
    row = db.execute(text("""SELECT COALESCE(SUM(te.worked_minutes*u.hourly_rate/60),0) amount FROM time_entries te
        JOIN users u ON u.id=te.user_id WHERE te.project_id=:id"""), {"id": project_id}).mappings().one()
    return {"projectId": project_id, "cost": round(float(row["amount"]), 2), "currency": "UAH"}
