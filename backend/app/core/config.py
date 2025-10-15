import json
from functools import lru_cache
from typing import List

from pydantic import BaseSettings, Field, validator


class Settings(BaseSettings):
    app_name: str = "PZB Zudatenberechner"
    api_prefix: str = "/api"
    database_url: str = Field(
        default="postgresql+psycopg://postgres:postgres@db:5432/pzb",
        env="DATABASE_URL",
    )
    cors_origins: List[str] | str = Field(default="http://localhost:5173", env="CORS_ORIGINS")

    @validator("cors_origins", pre=True)
    def split_origins(cls, value: object) -> List[str]:
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                try:
                    parsed = json.loads(stripped)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except json.JSONDecodeError:
                    pass
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        return ["http://localhost:5173"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    if isinstance(settings.cors_origins, str):
        settings.cors_origins = [settings.cors_origins]
    return settings
