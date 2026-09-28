from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import hash_password


def find_user_by_email(db: Session, email: str):
    return db.execute(text("""
        SELECT id,email,full_name,role,department_id,position_id,is_active,hire_date,hourly_rate,password_hash
        FROM users WHERE lower(email)=lower(:email)
    """), {"email": email}).mappings().first()


def find_active_user(db: Session, user_id: int):
    return db.execute(text("""
        SELECT id,email,full_name,role,department_id,position_id,is_active,hire_date,hourly_rate
        FROM users WHERE id=:id AND is_active=true
    """), {"id": user_id}).mappings().first()


def replace_placeholder_demo_passwords(db: Session, password: str) -> None:
    # lab5 intentionally ships placeholder hashes; initialize them once for runnable demo accounts.
    db.execute(text("UPDATE users SET password_hash=:password WHERE password_hash LIKE '$2b$12$stub%'"),
               {"password": hash_password(password)})
    db.commit()


def record_login(db: Session, user_id: int, email: str, ip: str | None) -> None:
    db.execute(text("""
        INSERT INTO audit_log(user_id,action,entity_type,entity_id,new_value,ip_address)
        VALUES (:user_id,'LOGIN','users',:user_id,jsonb_build_object('email',CAST(:email AS text)),CAST(:ip AS inet))
    """), {"user_id": user_id, "email": email, "ip": ip})
    db.commit()
