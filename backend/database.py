import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from alembic.config import Config as AlembicConfig
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory

DEFAULT_SQLITE_PATH = os.path.join(os.path.dirname(__file__), "app.db")
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{DEFAULT_SQLITE_PATH.replace(os.sep, '/')}",
)

engine_options = {"pool_pre_ping": True}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine_options["connect_args"] = {"check_same_thread": False}

engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_options)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def database_revision_status() -> tuple[str | None, str]:
    """Return the database revision and the migration head shipped with the app."""
    config_path = os.path.join(os.path.dirname(__file__), "alembic.ini")
    alembic_config = AlembicConfig(config_path)
    alembic_config.set_main_option("script_location", os.path.join(os.path.dirname(__file__), "migrations"))
    head_revision = ScriptDirectory.from_config(alembic_config).get_current_head()
    with engine.connect() as connection:
        current_revision = MigrationContext.configure(connection).get_current_revision()
    return current_revision, head_revision


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
