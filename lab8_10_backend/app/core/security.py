from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from pwdlib import PasswordHash

from app.core.config import get_settings

ALGORITHM = "HS256"
password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return password_hash.verify(password, hashed)
    except (ValueError, TypeError):
        return False


def create_access_token(subject: str, role: str) -> tuple[str, int]:
    settings = get_settings()
    expires = timedelta(minutes=settings.jwt_expire_minutes)
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {"sub": subject, "role": role, "iat": now, "exp": now + expires, "iss": "timetracker-api"},
        settings.jwt_secret,
        algorithm=ALGORITHM,
    )
    return token, int(expires.total_seconds())


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, get_settings().jwt_secret, algorithms=[ALGORITHM], issuer="timetracker-api")
    except JWTError as exc:
        raise ValueError("Invalid or expired token") from exc
