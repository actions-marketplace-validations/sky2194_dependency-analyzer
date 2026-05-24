"""
db.py — PostgreSQL connection + schema for DepAnalyzer CVE cache.
Single source of truth for all DB access.
"""
import os
import logging
import psycopg2
import psycopg2.extras
from contextlib import contextmanager

log = logging.getLogger(__name__)

def _get_url():
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        raise RuntimeError("DATABASE_URL env var not set")
    return url

@contextmanager
def get_conn():
    """Context manager: yields a connection, commits on success, rolls back on error."""
    conn = psycopg2.connect(_get_url(), sslmode="require")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def get_cursor(conn):
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

# ── Schema ──────────────────────────────────────────────────────────────────
SCHEMA = """
CREATE TABLE IF NOT EXISTS vulnerabilities (
    id            SERIAL PRIMARY KEY,
    osv_id        TEXT NOT NULL,
    cve_id        TEXT,
    ecosystem     TEXT NOT NULL,
    package_name  TEXT NOT NULL,
    severity      TEXT,
    cvss_score    REAL DEFAULT 0.0,
    description   TEXT,
    affected_versions JSONB DEFAULT '[]',
    fixed_version TEXT,
    osv_url       TEXT,
    nvd_url       TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(osv_id, ecosystem, package_name)
);

CREATE INDEX IF NOT EXISTS idx_vuln_pkg_eco
    ON vulnerabilities (ecosystem, package_name);

CREATE INDEX IF NOT EXISTS idx_vuln_cve
    ON vulnerabilities (cve_id);

CREATE TABLE IF NOT EXISTS sync_log (
    id          SERIAL PRIMARY KEY,
    source      TEXT NOT NULL,   -- 'OSV_npm' | 'OSV_pypi' | 'OSV_maven' | 'EPSS' | 'KEV'
    status      TEXT NOT NULL,   -- 'ok' | 'error'
    records     INTEGER DEFAULT 0,
    message     TEXT,
    synced_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS epss_scores (
    cve_id      TEXT PRIMARY KEY,
    epss        REAL,
    percentile  REAL,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kev_entries (
    cve_id             TEXT PRIMARY KEY,
    vendor_project     TEXT,
    product            TEXT,
    vulnerability_name TEXT,
    date_added         DATE,
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);
"""

def init_schema():
    """Run once at startup — creates tables if they don't exist."""
    with get_conn() as conn:
        with get_cursor(conn) as cur:
            cur.execute(SCHEMA)
    log.info("DB schema initialised")

def last_sync_time(source: str):
    """Return ISO timestamp of last successful sync for a source, or None."""
    try:
        with get_conn() as conn:
            with get_cursor(conn) as cur:
                cur.execute(
                    "SELECT synced_at FROM sync_log WHERE source=%s AND status='ok' ORDER BY synced_at DESC LIMIT 1",
                    (source,)
                )
                row = cur.fetchone()
                return row["synced_at"].isoformat() if row else None
    except Exception as e:
        log.warning(f"last_sync_time error: {e}")
        return None
