"""
osv_sync.py — Delta sync via OSV API.
Seed (ZIP download) runs once via seed.py.
This file handles all ongoing syncs — only fetching what changed.

OSV delta API:
  GET https://api.osv.dev/v1/vulns?ecosystem=npm&modified_since=<ISO>&page_size=500
"""
import json
import logging
import requests
import time
from datetime import datetime, timezone

log = logging.getLogger(__name__)

OSV_API   = "https://api.osv.dev/v1"
PAGE_SIZE = 500

ECOSYSTEMS = [
    ("npm",   "npm"),
    ("PyPI",  "pypi"),
    ("Maven", "maven"),
]

def _parse_severity(vuln):
    for sev in vuln.get("severity", []):
        score_str = sev.get("score", "")
        try:
            score = float(score_str)
            if score >= 9.0: return "CRITICAL", score
            if score >= 7.0: return "HIGH",     score
            if score >= 4.0: return "MEDIUM",   score
            return "LOW", score
        except (ValueError, TypeError):
            pass
    db  = vuln.get("database_specific", {})
    sev = db.get("severity", "").upper()
    if sev in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
        return sev, {"CRITICAL": 9.5, "HIGH": 7.5, "MEDIUM": 5.0, "LOW": 2.0}[sev]
    return "MEDIUM", 0.0

def _get_fix_version(affected):
    for a in affected:
        for r in a.get("ranges", []):
            for ev in r.get("events", []):
                if "fixed" in ev and ev["fixed"]:
                    return ev["fixed"]
    return None

def _get_affected_versions(affected):
    versions = []
    for a in affected:
        versions.extend(a.get("versions", []))
    return list(set(versions))

def _upsert_vuln(cur, raw, osv_ecosystem):
    osv_id = raw.get("id", "")
    if not osv_id:
        return 0
    aliases  = raw.get("aliases", [])
    cve_id   = next((a for a in aliases if a.startswith("CVE-")), None)
    summary  = raw.get("summary", "") or (raw.get("details", "") or "")[:300]
    severity, cvss = _parse_severity(raw)
    affected = raw.get("affected", [])
    fix_ver  = _get_fix_version(affected)
    aff_vers = _get_affected_versions(affected)
    packages = list({
        a.get("package", {}).get("name", "")
        for a in affected
        if a.get("package", {}).get("name")
    })
    if not packages:
        return 0
    count = 0
    for pname in packages:
        cur.execute("""
            INSERT INTO vulnerabilities
                (osv_id, cve_id, ecosystem, package_name,
                 severity, cvss_score, description,
                 affected_versions, fixed_version,
                 osv_url, nvd_url, raw_osv, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, NOW())
            ON CONFLICT (osv_id, ecosystem, package_name)
            DO UPDATE SET
                cve_id            = EXCLUDED.cve_id,
                severity          = EXCLUDED.severity,
                cvss_score        = EXCLUDED.cvss_score,
                description       = EXCLUDED.description,
                affected_versions = EXCLUDED.affected_versions,
                fixed_version     = EXCLUDED.fixed_version,
                raw_osv           = EXCLUDED.raw_osv,
                updated_at        = NOW()
        """, (
            osv_id, cve_id, osv_ecosystem, pname,
            severity, cvss, summary,
            json.dumps(aff_vers), fix_ver,
            f"https://osv.dev/vulnerability/{osv_id}",
            f"https://nvd.nist.gov/vuln/detail/{cve_id}" if cve_id else None,
            json.dumps(raw),
        ))
        count += 1
    return count

def _last_sync_time(source: str):
    try:
        from db import get_conn, get_cursor
        with get_conn() as conn:
            with get_cursor(conn) as cur:
                cur.execute(
                    """SELECT synced_at FROM sync_log
                       WHERE source=%s AND status='ok'
                       ORDER BY synced_at DESC LIMIT 1""",
                    (source,)
                )
                row = cur.fetchone()
                return row["synced_at"] if row else None
    except Exception as e:
        log.warning(f"Could not read last_sync_time for {source}: {e}")
        return None

def delta_sync_ecosystem(osv_ecosystem: str, internal_eco: str):
    """
    Fetch only vulns modified since last sync.
    Typically 0-50 records per run — very fast.
    """
    from db import get_conn, get_cursor

    source = f"OSV_{internal_eco}"
    last   = _last_sync_time(source)

    if last:
        modified_since = last.strftime("%Y-%m-%dT%H:%M:%SZ")
        log.info(f"Delta sync {osv_ecosystem} since {modified_since}")
    else:
        from datetime import timedelta
        modified_since = (datetime.now(timezone.utc) - timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%SZ")
        log.warning(f"No prior sync for {osv_ecosystem} — fetching last 24h")

    total      = 0
    page_token = None
    sync_start = datetime.now(timezone.utc)

    try:
        while True:
            params = {
                "ecosystem":      osv_ecosystem,
                "modified_since": modified_since,
                "page_size":      PAGE_SIZE,
            }
            if page_token:
                params["page_token"] = page_token

            resp = requests.get(f"{OSV_API}/vulns", params=params, timeout=30)

            if resp.status_code == 429:
                log.warning("OSV rate limited — waiting 10s")
                time.sleep(10)
                continue

            resp.raise_for_status()
            data  = resp.json()
            vulns = data.get("vulns", [])

            if not vulns:
                break  # nothing changed

            with get_conn() as conn:
                with get_cursor(conn) as cur:
                    for v in vulns:
                        total += _upsert_vuln(cur, v, osv_ecosystem)

            page_token = data.get("next_page_token")
            if not page_token:
                break

            time.sleep(0.3)  # polite pause between pages

        _log_sync(source, "ok", total, None, sync_start)
        if total > 0:
            log.info(f"{osv_ecosystem} delta done: {total} records updated")
        else:
            log.debug(f"{osv_ecosystem}: no changes since last sync")
        return total

    except Exception as e:
        log.error(f"Delta sync error {osv_ecosystem}: {e}")
        _log_sync(source, "error", total, str(e), sync_start)
        return total

def sync_all():
    """Called by APScheduler every 5 minutes."""
    total = 0
    for osv_eco, internal_eco in ECOSYSTEMS:
        total += delta_sync_ecosystem(osv_eco, internal_eco)
    if total > 0:
        log.info(f"Delta sync complete: {total} records updated")
    return total

def _log_sync(source, status, records, message, synced_at=None):
    try:
        from db import get_conn, get_cursor
        ts = synced_at or datetime.now(timezone.utc)
        with get_conn() as conn:
            with get_cursor(conn) as cur:
                cur.execute(
                    """INSERT INTO sync_log (source, status, records, message, synced_at)
                       VALUES (%s,%s,%s,%s,%s)""",
                    (source, status, records, message, ts)
                )
    except Exception as e:
        log.warning(f"Could not write sync_log: {e}")
