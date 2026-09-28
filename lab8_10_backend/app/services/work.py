from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import translate_integrity_error
from app.repositories.work import can_manage_project, manager_can_manage_department, map_entry, map_project, map_task, project_row, record_change, user_row


def list_users(db: Session, actor, department_id: int | None = None) -> list[dict]:
    if actor["role"] not in {"manager", "hr_admin", "admin"}:
        raise HTTPException(403, "Team directory is restricted to management and HR")
    if actor["role"] == "manager":
        department_id = actor["department_id"]
        if department_id is None:
            return []
    rows = db.execute(text("""SELECT id,email,full_name,role,department_id,position_id,is_active,hire_date,hourly_rate,
        (SELECT COALESCE(sum(worked_minutes),0) FROM time_entries te WHERE te.user_id=u.id AND te.work_date >= CURRENT_DATE-6) week_minutes
        FROM users u WHERE (CAST(:department_id AS integer) IS NULL OR department_id=:department_id) ORDER BY full_name"""), {"department_id": department_id}).mappings()
    return [{"id": r["id"], "email": r["email"], "fullName": r["full_name"], "role": r["role"],
        "departmentId": r["department_id"], "positionId": r["position_id"], "isActive": r["is_active"],
        "hireDate": r["hire_date"].isoformat(), "hourlyRate": float(r["hourly_rate"]),
        "totalHoursThisWeek": round(float(r["week_minutes"] or 0)/60, 2)} for r in rows]


def set_hourly_rate(db: Session, actor, user_id: int, rate: float) -> dict:
    if actor["role"] not in {"admin", "manager"}:
        raise HTTPException(403, "Only a manager or administrator can set hourly rates")
    target = user_row(db, user_id)
    if not target:
        raise HTTPException(404, "User not found")
    if actor["role"] == "manager" and actor["department_id"] != target["department_id"]:
        raise HTTPException(403, "Managers can update rates only in their department")
    db.execute(text("UPDATE users SET hourly_rate=:rate,updated_at=now() WHERE id=:id"), {"rate": rate, "id": user_id})
    record_change(db, actor["id"], "UPDATE", "users.hourly_rate", user_id, {"hourlyRate": rate})
    db.commit()
    return {"userId": user_id, "hourlyRate": rate}


def list_projects(db: Session, actor) -> list[dict]:
    dept = actor["department_id"] if actor["role"] == "manager" else None
    rows = db.execute(text("""SELECT id FROM projects WHERE (CAST(:dept AS integer) IS NULL OR department_id=:dept) ORDER BY id"""), {"dept": dept}).mappings()
    return [map_project(project_row(db, row["id"])) for row in rows]


def get_project(db: Session, actor, project_id: int) -> dict:
    result = map_project(project_row(db, project_id))
    if not result:
        raise HTTPException(404, "Project not found")
    if actor["role"] == "manager" and actor["department_id"] != result["departmentId"]:
        raise HTTPException(403, "Project is outside your department")
    if actor["role"] == "employee":
        member = db.execute(text("SELECT 1 FROM project_members WHERE project_id=:p AND user_id=:u UNION SELECT 1 FROM projects WHERE id=:p AND lead_id=:u"), {"p": project_id, "u": actor["id"]}).first()
        if not member:
            raise HTTPException(403, "You are not assigned to this project")
    return result


def create_project(db: Session, actor, body) -> dict:
    if actor["role"] not in {"manager", "admin"}:
        raise HTTPException(403, "Only managers and administrators can create projects")
    if actor["role"] == "manager" and actor["department_id"] != body.department_id:
        raise HTTPException(403, "Managers can create projects only in their department")
    try:
        row = db.execute(text("""INSERT INTO projects(name,client_name,color,status,department_id,budget_hours,lead_id,start_date,deadline,description)
          VALUES(:name,:client,:color,:status,:dept,:budget,:lead,:start,:deadline,:description) RETURNING id"""),
          {"name": body.name, "client": body.client_name, "color": body.color, "status": body.status,
           "dept": body.department_id, "budget": body.budget_hours, "lead": body.lead_id,
           "start": body.start_date, "deadline": body.deadline, "description": body.description}).mappings().one()
        for user_id in set(body.member_ids):
            db.execute(text("INSERT INTO project_members(project_id,user_id) VALUES(:p,:u) ON CONFLICT DO NOTHING"), {"p": row["id"], "u": user_id})
        record_change(db, actor["id"], "INSERT", "projects", row["id"], {"name": body.name})
        db.commit()
        return map_project(project_row(db, row["id"]))
    except IntegrityError as error:
        db.rollback()
        raise translate_integrity_error(error)


def update_project(db: Session, actor, project_id: int, values: dict) -> dict:
    current = project_row(db, project_id)
    if not current:
        raise HTTPException(404, "Project not found")
    if not manager_can_manage_department(actor, current["department_id"]):
        raise HTTPException(403, "Only the department manager or an administrator can edit this project")
    member_ids = values.pop("member_ids", None)
    allowed = {"name","client_name","color","status","department_id","budget_hours","lead_id","start_date","deadline","description"}
    changes = {key:value for key,value in values.items() if key in allowed}
    if "department_id" in changes and actor["role"] == "manager" and changes["department_id"] != actor["department_id"]:
        raise HTTPException(403,"Managers cannot move projects to another department")
    if changes:
        changes["id"] = project_id
        sets = ",".join(f"{column}=:{column}" for column in changes if column != "id")
        try:
            db.execute(text(f"UPDATE projects SET {sets},updated_at=now() WHERE id=:id"), changes)
        except IntegrityError as error:
            db.rollback()
            raise translate_integrity_error(error)
    if member_ids is not None:
        db.execute(text("DELETE FROM project_members WHERE project_id=:id"),{"id":project_id})
        for user_id in set(member_ids):
            db.execute(text("INSERT INTO project_members(project_id,user_id) VALUES(:p,:u) ON CONFLICT DO NOTHING"),{"p":project_id,"u":user_id})
    record_change(db,actor["id"],"UPDATE","projects",project_id,values)
    db.commit()
    return map_project(project_row(db,project_id))


def list_tasks(db: Session, actor, project_id: int) -> list[dict]:
    get_project(db, actor, project_id)
    rows = db.execute(text("SELECT * FROM project_tasks WHERE project_id=:id ORDER BY id"), {"id": project_id}).mappings()
    return [map_task(row) for row in rows]


def create_task(db: Session, actor, body) -> dict:
    if actor["role"] not in {"manager", "admin"} or not can_manage_project(db, actor, body.project_id):
        raise HTTPException(403, "Only the project manager or an administrator can create tasks")
    try:
        row = db.execute(text("""INSERT INTO project_tasks(project_id,title,assignee_id,due_date,estimate_minutes)
          VALUES(:project,:title,:assignee,:due,:estimate) RETURNING *"""),
          {"project": body.project_id, "title": body.title, "assignee": body.assignee_id,
           "due": body.due_date, "estimate": body.estimate_minutes}).mappings().one()
        record_change(db, actor["id"], "INSERT", "project_tasks", row["id"], {"title": body.title})
        db.commit()
        return map_task(row)
    except IntegrityError as error:
        db.rollback()
        raise translate_integrity_error(error)


def update_task_status(db: Session, actor, task_id: int, status: str) -> dict:
    row = db.execute(text("SELECT * FROM project_tasks WHERE id=:id"), {"id": task_id}).mappings().first()
    if not row:
        raise HTTPException(404, "Task not found")
    if actor["role"] not in {"manager", "admin"} and row["assignee_id"] != actor["id"]:
        raise HTTPException(403, "Only the assignee or management can change task status")
    if actor["role"] == "manager" and not can_manage_project(db, actor, row["project_id"]):
        raise HTTPException(403, "Task is outside your department")
    db.execute(text("UPDATE project_tasks SET status=:status,updated_at=now() WHERE id=:id"), {"status": status, "id": task_id})
    record_change(db, actor["id"], "UPDATE", "project_tasks.status", task_id, {"status": status})
    db.commit()
    return map_task(db.execute(text("SELECT * FROM project_tasks WHERE id=:id"), {"id": task_id}).mappings().one())


def update_task_priority(db: Session, actor, task_id: int, priority: str) -> dict:
    row = db.execute(text("SELECT project_id FROM project_tasks WHERE id=:id"), {"id": task_id}).mappings().first()
    if not row:
        raise HTTPException(404, "Task not found")
    if actor["role"] not in {"manager", "admin"} or not can_manage_project(db, actor, row["project_id"]):
        raise HTTPException(403, "Only project management can change task priority")
    db.execute(text("UPDATE project_tasks SET priority=:priority,updated_at=now() WHERE id=:id"), {"priority": priority, "id": task_id})
    record_change(db, actor["id"], "UPDATE", "project_tasks.priority", task_id, {"priority": priority})
    db.commit()
    return map_task(db.execute(text("SELECT * FROM project_tasks WHERE id=:id"), {"id": task_id}).mappings().one())


def list_time_entries(db: Session, actor, from_date, to_date, user_id, status, page: int, page_size: int) -> dict:
    clauses = ["(CAST(:from_date AS date) IS NULL OR te.work_date>=:from_date)", "(CAST(:to_date AS date) IS NULL OR te.work_date<=:to_date)",
               "(CAST(:user_id AS integer) IS NULL OR te.user_id=:user_id)", "(CAST(:status AS time_entry_status) IS NULL OR te.status=CAST(:status AS time_entry_status))"]
    params = {"from_date": from_date, "to_date": to_date, "user_id": user_id, "status": status,
              "limit": page_size, "offset": (page-1)*page_size}
    if actor["role"] in {"employee", "accountant"}:
        clauses.append("te.user_id=:actor_id")
        params["actor_id"] = actor["id"]
    elif actor["role"] == "manager":
        clauses.append("u.department_id=:department_id")
        params["department_id"] = actor["department_id"]
    where = " AND ".join(clauses)
    rows = db.execute(text(f"SELECT te.* FROM time_entries te JOIN users u ON u.id=te.user_id WHERE {where} ORDER BY te.work_date DESC,te.check_in DESC LIMIT :limit OFFSET :offset"), params).mappings().all()
    total = db.execute(text(f"SELECT count(*) FROM time_entries te JOIN users u ON u.id=te.user_id WHERE {where}"), params).scalar_one()
    return {"items": [map_entry(row) for row in rows], "page": page, "pageSize": page_size, "total": total}


def create_time_entry(db: Session, actor, body) -> dict:
    target_id = body.user_id or actor["id"]
    target = user_row(db, target_id)
    if not target or not target["is_active"]:
        raise HTTPException(404, "Active user not found")
    if actor["role"] == "manager" and actor["department_id"] != target["department_id"]:
        raise HTTPException(403, "You can only create entries for your department")
    if target_id != actor["id"] and actor["role"] not in {"manager", "admin"}:
        if body.project_id is None or not can_manage_project(db, actor, body.project_id):
            raise HTTPException(403, "Only the project lead can create a manual entry for another employee")
    if target_id == actor["id"] and actor["role"] not in {"manager", "admin"}:
        if body.project_id is None or not can_manage_project(db, actor, body.project_id):
            raise HTTPException(403, "Manual time entries require a manager, administrator, or project lead")
    try:
        row = db.execute(text("""INSERT INTO time_entries(user_id,work_date,check_in,check_out,status,source,project_id,task_id,created_by,pause_minutes,lunch_minutes,notes)
         VALUES(:user,:date,:in,:out,:status,'manual',:project,:task,:actor,:pause,:lunch,:notes) RETURNING *"""),
         {"user": target_id, "date": body.work_date, "in": body.check_in, "out": body.check_out,
          "status": "completed" if body.check_out else "in_progress", "project": body.project_id,
          "task": body.task_id, "actor": actor["id"], "pause": body.pause_minutes,
          "lunch": body.lunch_minutes, "notes": body.note}).mappings().one()
        record_change(db, actor["id"], "INSERT", "time_entries", row["id"], {"userId": target_id, "source": "manual"})
        db.commit()
        return map_entry(row)
    except IntegrityError as error:
        db.rollback()
        raise translate_integrity_error(error)


def edit_time_entry(db: Session, actor, entry_id: int, values: dict) -> dict:
    row = db.execute(text("SELECT * FROM time_entries WHERE id=:id"), {"id": entry_id}).mappings().first()
    if not row:
        raise HTTPException(404, "Time entry not found")
    target_user = user_row(db, row["user_id"])
    allowed = manager_can_manage_department(actor, target_user["department_id"]) or (
        row["project_id"] is not None and can_manage_project(db, actor, row["project_id"])
    )
    if not allowed:
        raise HTTPException(403, "You cannot edit this time entry")
    allowed = {"work_date":"work_date", "check_in":"check_in", "check_out":"check_out", "status":"status", "project_id":"project_id", "task_id":"task_id", "note":"notes", "pause_minutes":"pause_minutes", "lunch_minutes":"lunch_minutes"}
    changes = {allowed[key]: value for key, value in values.items() if key in allowed}
    if not changes:
        return map_entry(row)
    changes["id"] = entry_id
    sets = ",".join(f"{column}=:{column}" for column in changes if column != "id")
    try:
        db.execute(text(f"UPDATE time_entries SET {sets},status=CASE WHEN status='in_progress' THEN 'edited' ELSE status END,updated_at=now() WHERE id=:id"), changes)
        record_change(db, actor["id"], "UPDATE", "time_entries", entry_id, values)
        db.commit()
        return map_entry(db.execute(text("SELECT * FROM time_entries WHERE id=:id"), {"id": entry_id}).mappings().one())
    except IntegrityError as error:
        db.rollback()
        raise translate_integrity_error(error)


def delete_time_entry(db: Session, actor, entry_id: int) -> None:
    row = db.execute(text("SELECT * FROM time_entries WHERE id=:id"), {"id": entry_id}).mappings().first()
    if not row:
        raise HTTPException(404, "Time entry not found")
    target = user_row(db, row["user_id"])
    allowed = manager_can_manage_department(actor, target["department_id"]) or (row["project_id"] is not None and can_manage_project(db, actor, row["project_id"]))
    if not allowed:
        raise HTTPException(403, "You cannot delete this time entry")
    record_change(db, actor["id"], "DELETE", "time_entries", entry_id, {"userId": row["user_id"]})
    db.execute(text("DELETE FROM time_entries WHERE id=:id"), {"id": entry_id})
    db.commit()
