from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.core.errors import translate_integrity_error
from app.dependencies import CurrentUser, DbSession, require_roles
from app.repositories.work import record_change
from app.schemas.domain import LeaveCreate, LeaveDecision, ReportCreate, ScheduleCreate

router = APIRouter(tags=["Leave, schedule and reports"])


def _leave_row(db, leave_id: int):
    return db.execute(text("""SELECT lr.*,lt.name leave_type_name,u.full_name FROM leave_requests lr
        JOIN leave_types lt ON lt.id=lr.leave_type_id JOIN users u ON u.id=lr.user_id WHERE lr.id=:id"""),
        {"id": leave_id}).mappings().first()


def _leave_json(row):
    return {"id":row["id"],"userId":row["user_id"],"leaveTypeId":row["leave_type_id"],
        "leaveType":row["leave_type_name"],"userName":row["full_name"],"startDate":row["start_date"].isoformat(),
        "endDate":row["end_date"].isoformat(),"daysCount":row["days_count"],"reason":row["reason"] or "",
        "status":row["status"],"approverId":row["approver_id"],"comment":row["comment"],
        "createdAt":row["created_at"].isoformat()}


@router.get("/leave-requests")
def leave_requests(db: DbSession, actor: CurrentUser, status: str | None = None):
    clauses = ["(CAST(:status AS text) IS NULL OR lr.status::text=CAST(:status AS text))"]
    params = {"status": status}
    if actor["role"] == "manager":
        clauses.append("u.department_id=:department_id")
        params["department_id"] = actor["department_id"]
    elif actor["role"] not in {"hr_admin", "admin"}:
        clauses.append("lr.user_id=:user_id")
        params["user_id"] = actor["id"]
    rows = db.execute(text("""SELECT lr.*,lt.name leave_type_name,u.full_name FROM leave_requests lr
        JOIN leave_types lt ON lt.id=lr.leave_type_id JOIN users u ON u.id=lr.user_id WHERE """+" AND ".join(clauses)+" ORDER BY lr.created_at DESC"), params).mappings()
    return [_leave_json(row) for row in rows]


@router.post("/leave-requests", status_code=201)
def create_leave(body: LeaveCreate, db: DbSession, actor: CurrentUser):
    conflict = db.execute(text("""SELECT 1 FROM leave_requests WHERE user_id=:user AND status IN ('pending','approved')
        AND daterange(start_date,end_date,'[]') && daterange(:start,:end,'[]') LIMIT 1"""),
        {"user": actor["id"], "start": body.start_date, "end": body.end_date}).first()
    if conflict:
        raise HTTPException(409, "The requested dates overlap another pending or approved request")
    try:
        row = db.execute(text("""INSERT INTO leave_requests(user_id,leave_type_id,start_date,end_date,reason)
            VALUES(:user,:type,:start,:end,:reason) RETURNING id"""),
            {"user": actor["id"], "type": body.leave_type_id, "start": body.start_date,
             "end": body.end_date, "reason": body.reason}).mappings().one()
        record_change(db, actor["id"], "INSERT", "leave_requests", row["id"], {"status":"pending"})
        db.commit()
        return _leave_json(_leave_row(db, row["id"]))
    except IntegrityError as error:
        db.rollback()
        raise translate_integrity_error(error)


@router.patch("/leave-requests/{leave_id}")
def decide_leave(leave_id: int, body: LeaveDecision, db: DbSession, actor: CurrentUser):
    row = _leave_row(db, leave_id)
    if not row:
        raise HTTPException(404, "Leave request not found")
    if body.status == "cancelled":
        if row["user_id"] != actor["id"] or row["status"] != "pending":
            raise HTTPException(403, "Only the requester can cancel a pending request")
        approver_id = None
        approved_at = None
    else:
        if actor["role"] not in {"manager", "hr_admin", "admin"}:
            raise HTTPException(403, "Only management or HR can decide leave requests")
        department = db.execute(text("SELECT department_id FROM users WHERE id=:id"), {"id":row["user_id"]}).scalar_one()
        if actor["role"] == "manager" and actor["department_id"] != department:
            raise HTTPException(403, "Request belongs to another department")
        if row["status"] != "pending":
            raise HTTPException(409, "Only pending requests can be decided")
        approver_id = actor["id"]
        approved_at = "now()"
    db.execute(text("UPDATE leave_requests SET status=:status,approver_id=:approver,approved_at="+(approved_at or "NULL")+",comment=:comment,updated_at=now() WHERE id=:id"),
        {"status":body.status,"approver":approver_id,"comment":body.comment,"id":leave_id})
    if body.status in {"approved", "rejected"}:
        db.execute(text("""INSERT INTO notifications(user_id,type,title,message,related_entity,related_entity_id)
            VALUES(:user,'leave_status_changed','Статус заявки оновлено',:message,'leave_request',:id)"""),
            {"user":row["user_id"],"message":f"Заявку на відпустку {body.status}","id":leave_id})
    record_change(db, actor["id"], "UPDATE", "leave_requests", leave_id, {"status":body.status,"comment":body.comment})
    db.commit()
    return _leave_json(_leave_row(db, leave_id))


@router.get("/schedules")
def schedules(db: DbSession, actor: CurrentUser, from_date: date | None = Query(None, alias="from"), to_date: date | None = Query(None, alias="to"), user_id: int | None = Query(None, alias="userId", gt=0)):
    conditions = ["(CAST(:from_date AS date) IS NULL OR s.work_date>=:from_date)","(CAST(:to_date AS date) IS NULL OR s.work_date<=:to_date)","(CAST(:user_id AS integer) IS NULL OR s.user_id=:user_id)"]
    params = {"from_date":from_date,"to_date":to_date,"user_id":user_id}
    if actor["role"] == "manager":
        conditions.append("u.department_id=:department")
        params["department"] = actor["department_id"]
    elif actor["role"] not in {"hr_admin","admin"}:
        conditions.append("s.user_id=:actor")
        params["actor"] = actor["id"]
    rows = db.execute(text("""SELECT s.* FROM schedules s JOIN users u ON u.id=s.user_id WHERE """+" AND ".join(conditions)+" ORDER BY s.work_date,s.user_id"),params).mappings()
    return [{"id":r["id"],"userId":r["user_id"],"workDate":r["work_date"].isoformat(),"shiftTemplateId":r["shift_template_id"],
        "plannedStart":r["planned_start"].isoformat(),"plannedEnd":r["planned_end"].isoformat(),"status":r["status"],"note":r["note"]} for r in rows]


@router.post("/schedules", status_code=201)
def create_schedule(body: ScheduleCreate, db: DbSession, actor: Annotated[dict, Depends(require_roles("manager","admin"))]):
    target_dept = db.execute(text("SELECT department_id FROM users WHERE id=:id"), {"id":body.user_id}).scalar()
    if target_dept is None:
        raise HTTPException(404,"User not found or has no department")
    if actor["role"] == "manager" and actor["department_id"] != target_dept:
        raise HTTPException(403,"You can schedule only your department")
    try:
        row = db.execute(text("""INSERT INTO schedules(user_id,work_date,shift_template_id,planned_start,planned_end,created_by,note)
            VALUES(:user,:date,:shift,:start,:end,:actor,:note) RETURNING id"""),
            {"user":body.user_id,"date":body.work_date,"shift":body.shift_template_id,"start":body.planned_start,
             "end":body.planned_end,"actor":actor["id"],"note":body.note}).mappings().one()
        record_change(db,actor["id"],"INSERT","schedules",row["id"],{"userId":body.user_id})
        db.commit()
        return {"id":row["id"],"userId":body.user_id,"workDate":body.work_date.isoformat(),
            "shiftTemplateId":body.shift_template_id,"plannedStart":body.planned_start.isoformat(),"plannedEnd":body.planned_end.isoformat(),"status":"planned","note":body.note}
    except IntegrityError as error:
        db.rollback()
        raise translate_integrity_error(error)


@router.post("/reports", status_code=201)
def create_report(body: ReportCreate, db: DbSession, actor: CurrentUser):
    if body.report_type == "payroll_cost_summary":
        if actor["role"] not in {"accountant","manager","admin"}:
            raise HTTPException(403,"Payroll reports are restricted to accounting and management")
    elif actor["role"] not in {"manager","hr_admin","admin"}:
        raise HTTPException(403,"Reports are restricted to management and HR")
    if actor["role"] == "manager":
        if body.department_id not in (None,actor["department_id"]):
            raise HTTPException(403,"Managers can only create reports for their department")
        department_id = actor["department_id"]
    else:
        department_id = body.department_id
    try:
        row = db.execute(text("""INSERT INTO reports(report_type,department_id,period_start,period_end,generated_by,parameters)
            VALUES(:type,:department,:start,:end,:user,CAST(:parameters AS jsonb)) RETURNING id,generated_at"""),
            {"type":body.report_type,"department":department_id,"start":body.period_start,"end":body.period_end,
             "user":actor["id"],"parameters":__import__("json").dumps(body.parameters)}).mappings().one()
        record_change(db,actor["id"],"INSERT","reports",row["id"],{"reportType":body.report_type})
        db.commit()
        return {"id":row["id"],"type":body.report_type,"departmentId":department_id,
            "periodStart":body.period_start.isoformat(),"periodEnd":body.period_end.isoformat(),
            "generatedBy":actor["id"],"generatedAt":row["generated_at"].isoformat()}
    except IntegrityError as error:
        db.rollback()
        raise translate_integrity_error(error)


@router.get("/reports")
def reports(db: DbSession, actor: CurrentUser, limit: int = Query(50, ge=1, le=200)):
    if actor["role"] not in {"manager","hr_admin","admin","accountant"}:
        raise HTTPException(403,"Reports are restricted to management, HR and accounting")
    if actor["role"] == "manager":
        rows=db.execute(text("SELECT * FROM reports WHERE department_id=:dept ORDER BY generated_at DESC LIMIT :limit"),{"dept":actor["department_id"],"limit":limit}).mappings()
    else:
        rows=db.execute(text("SELECT * FROM reports ORDER BY generated_at DESC LIMIT :limit"),{"limit":limit}).mappings()
    return [{"id":r["id"],"type":r["report_type"],"departmentId":r["department_id"],"periodStart":r["period_start"].isoformat(),
        "periodEnd":r["period_end"].isoformat(),"generatedBy":r["generated_by"],"fileUrl":r["file_url"],"generatedAt":r["generated_at"].isoformat()} for r in rows]


@router.get("/analytics/department-hours")
def department_hours(db: DbSession, actor: Annotated[dict, Depends(require_roles("manager","hr_admin","admin"))], from_date: date | None = Query(None,alias="from"), to_date: date | None = Query(None,alias="to")):
    dept = actor["department_id"] if actor["role"] == "manager" else None
    rows=db.execute(text("""SELECT d.id department_id,d.name,SUM(COALESCE(te.worked_minutes,0)) minutes
        FROM departments d LEFT JOIN users u ON u.department_id=d.id LEFT JOIN time_entries te ON te.user_id=u.id
        AND (CAST(:start AS date) IS NULL OR te.work_date>=:start) AND (CAST(:end AS date) IS NULL OR te.work_date<=:end)
        WHERE (CAST(:dept AS integer) IS NULL OR d.id=:dept) GROUP BY d.id,d.name ORDER BY d.name"""),
        {"start":from_date,"end":to_date,"dept":dept}).mappings()
    return [{"departmentId":r["department_id"],"departmentName":r["name"],"hours":round(float(r["minutes"] or 0)/60,2)} for r in rows]


@router.get("/analytics/lateness-trend")
def lateness_trend(db: DbSession, actor: Annotated[dict, Depends(require_roles("manager","hr_admin","admin"))], days: int = Query(7,ge=1,le=365)):
    dept = actor["department_id"] if actor["role"] == "manager" else None
    rows=db.execute(text("""SELECT work_date,COUNT(*) FILTER(WHERE late_minutes>0) late_count,AVG(late_minutes) FILTER(WHERE late_minutes>0) avg_minutes
        FROM v_time_entry_details d WHERE work_date>=CURRENT_DATE-(:days-1) AND (CAST(:dept AS integer) IS NULL OR department_id=:dept)
        GROUP BY work_date ORDER BY work_date"""),{"days":days,"dept":dept}).mappings()
    return [{"date":r["work_date"].isoformat(),"lateCount":r["late_count"],"averageMinutes":round(float(r["avg_minutes"] or 0),1)} for r in rows]
