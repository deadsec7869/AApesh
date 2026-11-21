from sqlalchemy import create_engine, event
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings

def create_database_engine(url):
    """Apply connection-scoped pragmas to every connection; release file handles on close."""
    sqlite = url.startswith("sqlite")
    options = {"connect_args": {"check_same_thread": False, "timeout": 5}}
    if sqlite and ":memory:" not in url:
        options["poolclass"] = NullPool
    result = create_engine(url, echo=False, **(options if sqlite else {}))
    if sqlite:
        @event.listens_for(result, "connect")
        def configure_connection(connection, _record):
            cursor = connection.cursor()
            try:
                cursor.execute("PRAGMA busy_timeout=5000")
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.execute("PRAGMA foreign_keys=ON")
            finally:
                cursor.close()
    return result


engine = create_database_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from backend.app import models  # noqa: F401 - Register all models
    Base.metadata.create_all(bind=engine)
