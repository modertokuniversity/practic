from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "TimeTracker API"
    database_url: str = "postgresql+psycopg://timetrack_user:timetrack_pass@localhost:5433/timetrack"
    jwt_secret: str = "local-development-secret-change-before-use-123456"
    jwt_expire_minutes: int = 480
    demo_user_password: str = "ChangeMe123!"
    cors_origins: str = "http://localhost:3100,http://127.0.0.1:3100"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def sqlalchemy_database_url(self) -> str:
        url = self.database_url
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+psycopg://", 1)
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
