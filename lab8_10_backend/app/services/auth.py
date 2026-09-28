from fastapi import HTTPException, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.repositories.auth import find_user_by_email, record_login


def user_public(row) -> dict:
    return {
        "id": row["id"], "email": row["email"], "fullName": row["full_name"], "role": row["role"],
        "departmentId": row["department_id"], "positionId": row.get("position_id"),
        "avatarColor": "#7C3AED", "isActive": row["is_active"],
        "hireDate": row["hire_date"].isoformat() if row.get("hire_date") else None,
        "hourlyRate": float(row.get("hourly_rate") or 0),
    }


def login(db: Session, email: str, password: str, request: Request) -> dict:
    row = find_user_by_email(db, email)
    if not row or not row["is_active"] or not verify_password(password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Email or password is incorrect")
    token, seconds = create_access_token(str(row["id"]), row["role"])
    record_login(db, row["id"], row["email"], request.client.host if request.client else None)
    return {"accessToken": token, "tokenType": "Bearer", "expiresIn": seconds, "user": user_public(row)}


def update_password(db: Session, user: dict, current_password: str, new_password: str) -> None:
    row = db.execute(text("SELECT password_hash FROM users WHERE id=:id"), {"id": user["id"]}).mappings().first()
    if not row or not verify_password(current_password, row["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    db.execute(text("UPDATE users SET password_hash=:password, updated_at=now() WHERE id=:id"),
               {"password": hash_password(new_password), "id": user["id"]})
    db.commit()
