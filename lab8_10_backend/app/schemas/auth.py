from pydantic import Field, field_validator

from app.schemas.common import ApiModel


class LoginRequest(ApiModel):
    email: str = Field(min_length=3, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=1, max_length=128)


class UserPublic(ApiModel):
    id: int
    email: str
    full_name: str
    role: str
    department_id: int | None
    position_id: int | None = None
    avatar_color: str = "#7C3AED"
    is_active: bool = True
    hire_date: str | None = None
    hourly_rate: float = 0


class LoginResponse(ApiModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserPublic


class PasswordChange(ApiModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)

    @field_validator("new_password")
    @classmethod
    def require_letters_and_numbers(cls, value: str) -> str:
        if not any(character.isalpha() for character in value) or not any(character.isdigit() for character in value):
            raise ValueError("Password must include at least one letter and one number")
        return value
