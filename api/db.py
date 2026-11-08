"""Postgres storage (Neon) for what MCG officers record: overrides, feedback, checklist ticks.

Connection string: DATABASE_URL in .env (never committed). Tables are created
on first use (CREATE TABLE IF NOT EXISTS), so there is no separate migration
step. Plain SQL via psycopg 3; no ORM, so either team member can read it.

Queries name tables as {overrides}, {feedback}, {checklist}; q() fills in the
schema-qualified name. (Nothing relies on search_path: Neon's pooler shares
server connections, so a session setting could leak between clients.)
AGRIM_DB_SCHEMA (optional) uses another schema; the tests use a throwaway one
so they never touch the real tables.
"""
import os
import re
from contextlib import contextmanager

from dotenv import load_dotenv
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from pipeline.config import ROOT

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS {overrides} (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    officer      TEXT NOT NULL,
    hotspot_id   TEXT NOT NULL,
    model_level  TEXT,                       -- what the model said when overridden
    new_level    TEXT NOT NULL CHECK (new_level IN ('red', 'amber', 'green')),
    reason       TEXT NOT NULL,
    valid_until  TIMESTAMPTZ NOT NULL,       -- stops applying after this
    is_exercise  BOOLEAN NOT NULL DEFAULT false,
    run_id       TEXT,                       -- forecast run, or 'exercise'
    revoked_at   TIMESTAMPTZ,
    revoked_by   TEXT
);
CREATE TABLE IF NOT EXISTS {feedback} (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    officer         TEXT NOT NULL,
    hotspot_id      TEXT NOT NULL,
    event_date      DATE NOT NULL,
    flooded         BOOLEAN NOT NULL,
    depth           TEXT CHECK (depth IN ('ankle', 'knee', 'waist', 'unknown')),
    duration_hours  REAL CHECK (duration_hours >= 0),
    notes           TEXT,
    predicted_level TEXT,                    -- level shown for that hotspot and day, if any run covered it
    run_id          TEXT
);
CREATE TABLE IF NOT EXISTS {checklist} (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_key     TEXT NOT NULL,               -- forecast run id, or 'exercise'
    zone        TEXT NOT NULL,
    hotspot_id  TEXT NOT NULL DEFAULT '',    -- '' for zone-wide items
    item        TEXT NOT NULL CHECK (item IN ('list_issued', 'gullies_cleared', 'pump_moved', 'pump_tested')),
    done        BOOLEAN NOT NULL,
    officer     TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (run_key, zone, hotspot_id, item)
);
CREATE TABLE IF NOT EXISTS {alerts_log} (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    officer      TEXT NOT NULL,              -- who approved the send
    hotspot_id   TEXT NOT NULL,
    level        TEXT NOT NULL,
    is_exercise  BOOLEAN NOT NULL,
    channel      TEXT NOT NULL,              -- console / twilio
    recipient    TEXT NOT NULL,              -- masked, never a full number
    status       TEXT NOT NULL,              -- logged / sent / failed / unknown / refused / not_configured
    detail       TEXT,
    sms_en       TEXT NOT NULL,
    sms_hi       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS overrides_active ON {overrides} (hotspot_id, is_exercise, valid_until);
"""

_pool: ConnectionPool | None = None
_ready = False


def _schema() -> str | None:
    name = os.getenv("AGRIM_DB_SCHEMA", "").strip()
    if name and not re.fullmatch(r"[a-z_][a-z0-9_]{0,40}", name):
        raise ValueError("AGRIM_DB_SCHEMA must be a simple lower-case name")
    return name or None


def _url() -> str | None:
    # Re-read .env so a connection string added while the server runs is picked up.
    load_dotenv(ROOT / ".env")
    return os.getenv("DATABASE_URL") or None


def configured() -> bool:
    return _url() is not None


def pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        url = _url()
        if not url:
            raise RuntimeError("DATABASE_URL is not set. Add your Neon connection string to .env.")
        # Small pool: Neon's pooled endpoint does the heavy lifting.
        # prepare_threshold=None: Neon's pooler (PgBouncer, transaction mode)
        # can hand each transaction a different server connection, so
        # server-side prepared statements must be off.
        _pool = ConnectionPool(url, min_size=0, max_size=4,
                               kwargs={"row_factory": dict_row, "prepare_threshold": None}, open=True)
    return _pool


TABLES = ("overrides", "feedback", "checklist", "alerts_log")


def q(sql: str) -> str:
    """Fill {overrides} / {feedback} / {checklist} with schema-qualified table names."""
    schema = _schema() or "public"
    return sql.format(**{t: f"{schema}.{t}" for t in TABLES})


@contextmanager
def connect():
    """One transaction: commits on success, rolls back on error."""
    global _ready
    with pool().connection() as conn:
        if not _ready:
            schema = _schema()
            if schema:
                conn.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")
            conn.execute(q(SCHEMA_SQL))
            _ready = True
        yield conn


def close():
    """Close the pool (app shutdown, tests)."""
    global _pool, _ready
    if _pool is not None:
        _pool.close()
    _pool, _ready = None, False
