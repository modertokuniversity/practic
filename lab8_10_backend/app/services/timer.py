from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.repositories.work import record_change


def timer_state(db: Session, user_id: int):
    row = db.execute(text("SELECT * FROM active_timer_sessions WHERE user_id=:user"), {"user": user_id}).mappings().first()
    if not row:
        return {"status":"idle","projectId":None,"taskId":None,"note":"","startedAt":None}
    return {"status":row["state"],"projectId":row["project_id"],"taskId":row["task_id"],
        "note":row["note"] or "","startedAt":row["started_at"].isoformat(),"updatedAt":row["updated_at"].isoformat()}


def start(db: Session, user_id: int, project_id: int | None, task_id: int | None, note: str | None):
    try:
        db.execute(text("""INSERT INTO active_timer_sessions(user_id,started_at,state,state_started_at,project_id,task_id,note)
            VALUES(:user,now(),'work',now(),:project,:task,:note)"""),
            {"user":user_id,"project":project_id,"task":task_id,"note":note})
        record_change(db,user_id,"START","timer",user_id,{"projectId":project_id,"taskId":task_id})
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409,"A timer is already active")
    return timer_state(db,user_id)


def transition(db: Session, user_id: int, action: str):
    row = db.execute(text("SELECT * FROM active_timer_sessions WHERE user_id=:user FOR UPDATE"), {"user":user_id}).mappings().first()
    if not row:
        raise HTTPException(409,"There is no active timer")
    state = row["state"]
    if action == "pause" and state == "work":
        db.execute(text("UPDATE active_timer_sessions SET state='pause',state_started_at=now(),updated_at=now() WHERE user_id=:user"), {"user":user_id})
    elif action == "resume" and state == "pause":
        db.execute(text("UPDATE active_timer_sessions SET state='work',pause_minutes=pause_minutes+GREATEST(0,ROUND(EXTRACT(EPOCH FROM(now()-state_started_at))/60)::int),state_started_at=now(),updated_at=now() WHERE user_id=:user"), {"user":user_id})
    elif action == "lunch/start" and state in {"work","pause"}:
        if state == "pause":
            db.execute(text("UPDATE active_timer_sessions SET pause_minutes=pause_minutes+GREATEST(0,ROUND(EXTRACT(EPOCH FROM(now()-state_started_at))/60)::int) WHERE user_id=:user"), {"user":user_id})
        db.execute(text("UPDATE active_timer_sessions SET state='lunch',state_started_at=now(),updated_at=now() WHERE user_id=:user"), {"user":user_id})
    elif action == "lunch/end" and state == "lunch":
        db.execute(text("UPDATE active_timer_sessions SET state='work',lunch_minutes=lunch_minutes+GREATEST(0,ROUND(EXTRACT(EPOCH FROM(now()-state_started_at))/60)::int),state_started_at=now(),updated_at=now() WHERE user_id=:user"), {"user":user_id})
    else:
        raise HTTPException(409,f"Cannot {action} while timer state is '{state}'")
    db.commit()
    return timer_state(db,user_id)


def stop(db: Session, user_id: int):
    row = db.execute(text("SELECT * FROM active_timer_sessions WHERE user_id=:user FOR UPDATE"), {"user":user_id}).mappings().first()
    if not row:
        raise HTTPException(409,"There is no active timer")
    pause_minutes = row["pause_minutes"] + (max(0,int(db.execute(text("SELECT ROUND(EXTRACT(EPOCH FROM(now()-:started))/60)::int"), {"started":row["state_started_at"]}).scalar_one())) if row["state"] == "pause" else 0)
    lunch_minutes = row["lunch_minutes"] + (max(0,int(db.execute(text("SELECT ROUND(EXTRACT(EPOCH FROM(now()-:started))/60)::int"), {"started":row["state_started_at"]}).scalar_one())) if row["state"] == "lunch" else 0)
    entry = db.execute(text("""INSERT INTO time_entries(user_id,work_date,check_in,check_out,status,source,project_id,task_id,created_by,pause_minutes,lunch_minutes,notes)
       VALUES(:user,(started_at AT TIME ZONE 'Europe/Kyiv')::date,started_at,now(),'completed','timer',:project,:task,:user,:pause,:lunch,:note) RETURNING *"""),
       {"user":user_id,"started_at":row["started_at"],"project":row["project_id"],"task":row["task_id"],
        "pause":pause_minutes,"lunch":lunch_minutes,"note":row["note"]}).mappings().one()
    db.execute(text("DELETE FROM active_timer_sessions WHERE user_id=:user"), {"user":user_id})
    record_change(db,user_id,"STOP","timer",user_id,{"entryId":entry["id"]})
    db.commit()
    return {"id":entry["id"],"userId":entry["user_id"],"workDate":entry["work_date"].isoformat(),
        "checkIn":entry["check_in"].isoformat(),"checkOut":entry["check_out"].isoformat(),"status":entry["status"],
        "projectId":entry["project_id"],"taskId":entry["task_id"],"source":entry["source"],"createdBy":entry["created_by"],
        "pauseMinutes":entry["pause_minutes"],"lunchMinutes":entry["lunch_minutes"],"workedMinutes":entry["worked_minutes"],"note":entry["notes"]}
