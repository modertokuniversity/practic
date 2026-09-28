from fastapi import APIRouter, Depends, Request
from sqlalchemy import text

from app.dependencies import CurrentUser, DbSession
from app.schemas.auth import LoginRequest, PasswordChange
from app.services.auth import login, update_password, user_public

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", summary="Sign in and receive a JWT access token")
def sign_in(body: LoginRequest, request: Request, db: DbSession):
    return login(db, str(body.email), body.password, request)


@router.get("/me", summary="Get the current user's profile")
def me(user: CurrentUser, db: DbSession):
    row = db.execute(text("SELECT id,email,full_name,role,department_id,position_id,is_active,hire_date,hourly_rate FROM users WHERE id=:id"), {"id": user["id"]}).mappings().one()
    return {"user": user_public(row)}


@router.patch("/password", status_code=204, summary="Change the current user's password")
def change_password(body: PasswordChange, user: CurrentUser, db: DbSession):
    update_password(db, user, body.current_password, body.new_password)


@router.get("/demo-accounts", summary="List the seeded demo logins")
def demo_accounts(db: DbSession):
    rows = db.execute(text("SELECT id,email,full_name,role FROM users WHERE is_active=true ORDER BY id")).mappings()
    return [{"id": r["id"], "email": r["email"], "fullName": r["full_name"], "role": r["role"]} for r in rows]
