"""Apply db/init.sql against DATABASE_URL — for bootstrapping an empty
production database (e.g. a fresh Railway Postgres) that never got the
docker-entrypoint-initdb.d treatment docker-compose gives the local one.

Not a migration tool: it's the same one-shot DDL+seed script as init.sql,
so it only works against an empty database. Schema changes made afterwards
still need to be applied by hand (see README).

Run with: python -m app.init_db
"""
import pathlib

from .db import engine


def _find_schema_path() -> pathlib.Path:
    # In the Docker image, db/init.sql sits at /app/db (sibling of /app/app).
    # Run directly from a repo checkout (no container), it's two levels
    # further up, at <repo root>/db.
    here = pathlib.Path(__file__).resolve().parent  # .../app
    for base in (here.parent, here.parent.parent):
        candidate = base / "db" / "init.sql"
        if candidate.exists():
            return candidate
    raise FileNotFoundError("Could not locate db/init.sql relative to backend/app/init_db.py")


SCHEMA_PATH = _find_schema_path()


def init_db():
    sql = SCHEMA_PATH.read_text(encoding="utf-8")
    with engine.begin() as conn:
        # exec_driver_sql passes the script straight to the DBAPI, bypassing
        # SQLAlchemy's text() bind-parameter parsing (which would choke on
        # the ":"-containing comments in the SQL file).
        conn.exec_driver_sql(sql)
    print(f"Schema applied from {SCHEMA_PATH}.")


if __name__ == "__main__":
    init_db()
