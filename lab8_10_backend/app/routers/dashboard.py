from datetime import date

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text

from app.dependencies import CurrentUser, DbSession

router = APIRouter(tags=["Dashboard and notifications"])


@router.get("/dashboard/summary")
def dashboard_summary(db: DbSession, actor: CurrentUser, scope: str = Query("me", pattern="^(me|department)$")):
    if scope == "department" and actor["role"] not in {"manager","hr_admin","admin"}:
        raise HTTPException(403,"Department dashboard is restricted to management and HR")
    if actor["role"] == "manager" and scope == "department":
        department_clause = "u.department_id=:department"
        department_id = actor["department_id"]
    elif scope == "department":
        department_clause = "true"
        department_id = None
    else:
        department_clause = "te.user_id=:user"
        department_id = None
    params = {"user":actor["id"],"department":department_id}
    total_minutes = db.execute(text("""SELECT COALESCE(SUM(te.worked_minutes),0) FROM time_entries te JOIN users u ON u.id=te.user_id
        WHERE te.work_date>=CURRENT_DATE-6 AND """+department_clause),params).scalar_one()
    checked = db.execute(text("""SELECT u.id,u.full_name FROM v_currently_checked_in c JOIN users u ON u.id=c.user_id
        WHERE (CAST(:department AS integer) IS NULL OR u.department_id=:department) ORDER BY u.full_name"""),params).mappings()
    pending = []
    if actor["role"] in {"manager","hr_admin","admin"}:
        pending = list(db.execute(text("""SELECT lr.id,lr.user_id,u.full_name,lr.start_date,lr.end_date,lr.days_count
            FROM leave_requests lr JOIN users u ON u.id=lr.user_id WHERE lr.status='pending'
            AND (CAST(:department AS integer) IS NULL OR u.department_id=:department) ORDER BY lr.created_at DESC LIMIT 8"""),params).mappings())
    return {"weeklyHours":round(float(total_minutes or 0)/60,2),
        "checkedInNow":[{"userId":r["id"],"fullName":r["full_name"]} for r in checked],
        "pendingLeave":[{"id":r["id"],"userId":r["user_id"],"fullName":r["full_name"],"startDate":r["start_date"].isoformat(),"endDate":r["end_date"].isoformat(),"daysCount":r["days_count"]} for r in pending]}


@router.get("/notifications")
def notifications(db: DbSession, actor: CurrentUser, unread_only: bool = Query(False, alias="unreadOnly")):
    rows = db.execute(text("SELECT * FROM notifications WHERE user_id=:user AND (:unread=false OR is_read=false) ORDER BY created_at DESC LIMIT 100"), {"user":actor["id"],"unread":unread_only}).mappings()
    return [{"id":r["id"],"userId":r["user_id"],"type":r["type"],"title":r["title"],"message":r["message"],"relatedEntity":r["related_entity"],"relatedEntityId":r["related_entity_id"],"isRead":r["is_read"],"createdAt":r["created_at"].isoformat()} for r in rows]


@router.patch("/notifications/{notification_id}")
def mark_notification_read(notification_id: int, db: DbSession, actor: CurrentUser, is_read: bool = Query(True, alias="isRead")):
    row = db.execute(text("UPDATE notifications SET is_read=:read,read_at=CASE WHEN :read THEN now() ELSE NULL END WHERE id=:id AND user_id=:user RETURNING id,is_read"), {"read":is_read,"id":notification_id,"user":actor["id"]}).mappings().first()
    if not row:
        raise HTTPException(404,"Notification not found")
    return {"id":row["id"],"isRead":row["is_read"]}


@router.get("/analytics/leave-requests/by-type")
def leave_by_type(db: DbSession, actor: CurrentUser, from_date: date | None = Query(None,alias="from"), to_date: date | None = Query(None,alias="to")):
    if actor["role"] not in {"manager","hr_admin","admin"}:
        raise HTTPException(403,"Leave analytics is restricted to management and HR")
    department = actor["department_id"] if actor["role"] == "manager" else None
    rows=db.execute(text("""SELECT lt.id,lt.name,count(lr.id) request_count FROM leave_types lt LEFT JOIN leave_requests lr
        ON lr.leave_type_id=lt.id AND (CAST(:start AS date) IS NULL OR lr.start_date>=:start) AND (CAST(:end AS date) IS NULL OR lr.end_date<=:end)
        LEFT JOIN users u ON u.id=lr.user_id WHERE (CAST(:dept AS integer) IS NULL OR u.department_id=:dept)
        GROUP BY lt.id,lt.name ORDER BY lt.name"""),{"start":from_date,"end":to_date,"dept":department}).mappings()
    return [{"leaveTypeId":r["id"],"leaveType":r["name"],"requestCount":r["request_count"]} for r in rows]
