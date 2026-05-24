"""
epss_kev_sync.py — Sync EPSS scores and CISA KEV list into PostgreSQL.
Both are free, public, and small (~100KB each).
EPSS: https://epss.cyentia.com/epss_scores-current.csv.gz
KEV:  https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
"""
import csv
import gzip
import io
import json
import logging
import requests

log = logging.getLogger(__name__)

EPSS_URL = "https://epss.cyentia.com/epss_scores-current.csv.gz"
KEV_URL  = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"

def sync_epss():
    """Download current EPSS scores and upsert into epss_scores table."""
    from db import get_conn, get_cursor

    log.info("Downloading EPSS scores...")
    try:
        resp = requests.get(EPSS_URL, timeout=60)
        resp.raise_for_status()
    except Exception as e:
        log.error(f"EPSS download failed: {e}")
        _log_sync("EPSS", "error", 0, str(e))
        return 0

    try:
        content = gzip.decompress(resp.content).decode("utf-8")
        reader  = csv.DictReader(io.StringIO(content))
        inserted = 0
        with get_conn() as conn:
            with get_cursor(conn) as cur:
                for row in reader:
                    cve_id = row.get("cve") or row.get("#cve") or ""
                    if not cve_id.startswith("CVE-"):
                        continue
                    try:
                        cur.execute("""
                            INSERT INTO epss_scores (cve_id, epss, percentile, updated_at)
                            VALUES (%s, %s, %s, NOW())
                            ON CONFLICT (cve_id) DO UPDATE SET
                                epss       = EXCLUDED.epss,
                                percentile = EXCLUDED.percentile,
                                updated_at = NOW()
                        """, (cve_id, float(row.get("epss", 0)),
                              float(row.get("percentile", 0))))
                        inserted += 1
                    except Exception:
                        continue

        log.info(f"EPSS sync complete: {inserted} records")
        _log_sync("EPSS", "ok", inserted, None)
        return inserted
    except Exception as e:
        log.error(f"EPSS parse error: {e}")
        _log_sync("EPSS", "error", 0, str(e))
        return 0

def sync_kev():
    """Download CISA KEV list and upsert into kev_entries table."""
    from db import get_conn, get_cursor

    log.info("Downloading CISA KEV list...")
    try:
        resp = requests.get(KEV_URL, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        log.error(f"KEV download failed: {e}")
        _log_sync("KEV", "error", 0, str(e))
        return 0

    inserted = 0
    try:
        with get_conn() as conn:
            with get_cursor(conn) as cur:
                for entry in data.get("vulnerabilities", []):
                    cve_id = entry.get("cveID", "")
                    if not cve_id:
                        continue
                    try:
                        cur.execute("""
                            INSERT INTO kev_entries
                                (cve_id, vendor_project, product,
                                 vulnerability_name, date_added, updated_at)
                            VALUES (%s,%s,%s,%s,%s::date, NOW())
                            ON CONFLICT (cve_id) DO UPDATE SET
                                vendor_project    = EXCLUDED.vendor_project,
                                product           = EXCLUDED.product,
                                vulnerability_name= EXCLUDED.vulnerability_name,
                                date_added        = EXCLUDED.date_added,
                                updated_at        = NOW()
                        """, (
                            cve_id,
                            entry.get("vendorProject", ""),
                            entry.get("product", ""),
                            entry.get("vulnerabilityName", ""),
                            entry.get("dateAdded") or None,
                        ))
                        inserted += 1
                    except Exception:
                        continue

        log.info(f"KEV sync complete: {inserted} records")
        _log_sync("KEV", "ok", inserted, None)
        return inserted
    except Exception as e:
        log.error(f"KEV parse error: {e}")
        _log_sync("KEV", "error", 0, str(e))
        return 0

def _log_sync(source, status, records, message):
    try:
        from db import get_conn, get_cursor
        with get_conn() as conn:
            with get_cursor(conn) as cur:
                cur.execute(
                    "INSERT INTO sync_log (source, status, records, message) VALUES (%s,%s,%s,%s)",
                    (source, status, records, message)
                )
    except Exception as e:
        log.warning(f"Could not write sync_log: {e}")
