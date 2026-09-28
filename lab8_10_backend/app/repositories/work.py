from sqlalchemy import text
from sqlalchemy.orm import Session


def record_change(db: Session, user_id: int, action: str, entity: str, entity_id: int | None, data: dict | None = None) -> None:
    import json
    db.execute(text("""INSERT INTO audit_log(user_id,action,entity_type,entity_id,new_value)
        VALUES(:user_id,:action,:entity,:entity_id,CAST(:data AS jsonb))"""),
        {"user_id": user_id, "action": action, "entity": entity, "entity_id": entity_id,
         "data": json.dumps(data, default=str) if data is not None else None})


def project_row(db: Session, project_id: int):
    return db.execute(text("""
        SELECT p.*,COALESCE((SELECT array_agg(pm.user_id ORDER BY pm.user_id) FROM project_members pm WHERE pm.project_id=p.id),'{}') member_ids,
        COALESCE((SELECT count(*) FROM project_tasks t WHERE t.project_id=p.id AND t.status='done'),0) done_tasks,
        COALESCE((SELECT count(*) FROM project_tasks t WHERE t.project_id=p.id),0) total_tasks,
        COALESCE((SELECT sum(te.worked_minutes) FROM time_entries te WHERE te.project_id=p.id),0) actual_minutes
        FROM projects p WHERE p.id=:id
    """), {"id": project_id}).mappings().first()


def map_project(row):
    if not row:
        return None
    return {"id": row["id"], "name": row["name"], "clientName": row["client_name"], "color": row["color"],
        "status": row["status"], "departmentId": row["department_id"], "budgetHours": float(row["budget_hours"]),
        "leadId": row["lead_id"], "memberIds": list(row["member_ids"] or []),
        "startDate": row["start_date"].isoformat(), "deadline": row["deadline"].isoformat() if row["deadline"] else None,
        "description": row["description"] or "", "stats": {"doneTasks": row["done_tasks"], "totalTasks": row["total_tasks"], "actualHours": round(float(row["actual_minutes"] or 0)/60, 2)}}


def map_task(row):
    return {"id": row["id"], "projectId": row["project_id"], "title": row["title"], "status": row["status"],
        "priority": row["priority"], "assigneeId": row["assignee_id"],
        "dueDate": row["due_date"].isoformat() if row["due_date"] else None,
        "estimateMinutes": row["estimate_minutes"]}


def map_entry(row):
    return {"id": row["id"], "userId": row["user_id"], "workDate": row["work_date"].isoformat(),
        "checkIn": row["check_in"].isoformat(), "checkOut": row["check_out"].isoformat() if row["check_out"] else None,
        "status": row["status"], "projectId": row["project_id"], "taskId": row["task_id"], "note": row["notes"],
        "source": row["source"], "createdBy": row["created_by"], "pauseMinutes": row["pause_minutes"],
        "lunchMinutes": row["lunch_minutes"], "workedMinutes": row["worked_minutes"]}


def manager_can_manage_department(user, department_id: int) -> bool:
    return user["role"] == "admin" or (user["role"] == "manager" and user["department_id"] == department_id)


def can_manage_project(db: Session, user, project_id: int) -> bool:
    project = db.execute(text("SELECT department_id,lead_id FROM projects WHERE id=:id"), {"id": project_id}).mappings().first()
    if not project:
        return False
    return manager_can_manage_department(user, project["department_id"]) or (user["role"] == "employee" and project["lead_id"] == user["id"])


def user_row(db: Session, user_id: int):
    return db.execute(text("""SELECT id,email,full_name,role,department_id,position_id,is_active,hire_date,hourly_rate
        FROM users WHERE id=:id"""), {"id": user_id}).mappings().first()
