import os
from pathlib import Path
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _user_data_file(filename: str) -> str:
    data_dir = os.getenv("AAPESH_USER_DATA_DIR")
    if not data_dir:
        return filename
    directory = Path(data_dir)
    directory.mkdir(parents=True, exist_ok=True)
    return str(directory / filename)


def _default_database_url() -> str:
    database_path = _user_data_file("aurora_music.db")
    if database_path == "aurora_music.db":
        return "sqlite:///./aurora_music.db"
    # SQLAlchemy's SQLite URL format uses forward slashes on Windows.
    return f"sqlite:///{Path(database_path).as_posix()}"


class Settings(BaseSettings):
    APP_NAME: str = "Aurora Music API"
    APP_ENV: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = Field(default_factory=_default_database_url)

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
    ]

    # In-memory Cache
    CACHE_TTL_SECONDS: int = 1800  # 30 minutes default cache

    # ytmusicapi configuration
    YTMUSIC_OAUTH_TOKEN_PATH: str = Field(default_factory=lambda: _user_data_file("oauth.json"))
    YTMUSIC_CLIENT_ID: str = ""
    YTMUSIC_CLIENT_SECRET: str = ""
    YTMUSIC_HEADERS_PATH: str = Field(default_factory=lambda: _user_data_file("browser.json"))

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        return ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
