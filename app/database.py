"""
database.py — SQLAlchemy engine, session factory, and declarative Base.

Using SQLite for now (see config.py). Because SQLAlchemy abstracts the
engine, switching to Postgres later is just a DATABASE_URL change plus
swapping the driver in requirements.txt (e.g. psycopg2-binary) — none of
the models or queries need to change.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import get_settings

settings = get_settings()

# check_same_thread is only needed for SQLite; harmless to leave conditional
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db() -> None:
    """Create tables from models. Fine for learning/dev; use Alembic migrations later."""
    # Import models here so they're registered on Base.metadata before create_all runs.
    from app.models import user, post, comment  # noqa: F401

    Base.metadata.create_all(bind=engine)
