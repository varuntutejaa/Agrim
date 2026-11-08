"""Shared test setup.

ops_db: runs a test against the Neon database in DATABASE_URL, inside a
throwaway schema that is dropped afterwards (real tables never touched).
Skipped if DATABASE_URL is not set.
"""
import os
import uuid

import pytest


@pytest.fixture()
def ops_db(monkeypatch):
    from api import db
    if not db.configured():
        pytest.skip("DATABASE_URL not set")
    schema = f"test_{uuid.uuid4().hex[:10]}"
    monkeypatch.setenv("AGRIM_DB_SCHEMA", schema)
    db.close()
    from api import ops
    ops._forget_active()
    yield ops
    ops._forget_active()
    with db.connect() as conn:
        conn.execute(f"DROP SCHEMA {schema} CASCADE")
    db.close()
    os.environ.pop("AGRIM_DB_SCHEMA", None)
