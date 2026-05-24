"""
db_scanner.py — DB-first CVE lookup with live OSV fallback.
Drop-in replacement for the live osv_client calls in scanner.py.
"""
import logging
import json
from packaging.version import Version, InvalidVersion

log = logging.getLogger(__name__)

def _parse_ver(v):
    if not v or v == "0":
        return Version("0")
    try:
        return Version(v)
    except InvalidVersion:
        import re
        cleaned = re.sub(r"[._-]?(RELEASE|FINAL|GA|RC\d*|M\d*|SNAPSHOT)$", "", v, flags=re.I)
        try:
            return Version(cleaned)
        except InvalidVersion:
            return None

def _is_version_affected(installed_ver, affected_versions_json, raw_osv):
    """Check if installed version is in the affected range."""
    # Fast path: check flat version list from DB
    if installed_ver in (affected_versions_json or []):
        return True
    # Slow path: parse ranges from raw OSV
    if not raw_osv:
        return True  # conservative: assume affected
    affected = raw_osv.get("affected", [])
    installed = _parse_ver(installed_ver)
    if not installed:
        return True
    for a in affected:
        for r in a.get("ranges", []):
            if r.get("type") not in ("SEMVER", "ECOSYSTEM"):
                continue
            introduced = fixed = None
            for ev in r.get("events", []):
                if "introduced" in ev:
                    introduced = _parse_ver(ev["introduced"])
                if "fixed" in ev:
                    fixed = _parse_ver(ev["fixed"])
            if introduced is not None and installed >= introduced:
                if fixed is None or installed < fixed:
                    return True
    return False

def query_db(name: str, version: str, ecosystem: str) -> list:
    """
    Query local DB for vulnerabilities affecting name@version in ecosystem.
    Returns list of formatted vuln dicts (same shape as osv_client.format_vuln).
    Returns None if DB is unavailable (caller should fall back to live API).
    """
    eco_map = {"npm": "npm", "pypi": "PyPI", "maven": "Maven",
               "lockfile": "npm", "npm-lock": "npm"}
    eco = eco_map.get(ecosystem, ecosystem)

    try:
        from db import get_conn, get_cursor
        with get_conn() as conn:
            with get_cursor(conn) as cur:
                cur.execute(
                    """
                    SELECT osv_id, cve_id, severity, cvss_score, description,
                           fixed_version, osv_url, nvd_url,
                           affected_versions, raw_osv
                    FROM vulnerabilities
                    WHERE ecosystem = %s AND package_name = %s
                    """,
                    (eco, name)
                )
                rows = cur.fetchall()
    except Exception as e:
        log.warning(f"DB query failed for {name}@{version}: {e} — falling back to live API")
        return None  # signal fallback

    results = []
    for row in rows:
        affected_versions = row["affected_versions"] or []
        raw_osv = row["raw_osv"] or {}
        if not _is_version_affected(version, affected_versions, raw_osv):
            continue
        results.append({
            "cve_id":      row["cve_id"] or row["osv_id"],
            "source":      "DB",
            "osv_id":      row["osv_id"],
            "package":     name,
            "version":     version,
            "severity":    row["severity"] or "MEDIUM",
            "cvss_score":  round(float(row["cvss_score"] or 0.0), 1),
            "description": row["description"] or "",
            "fix_version": row["fixed_version"],
            "fix":         f">= {row['fixed_version']}" if row["fixed_version"] else None,
            "osv_url":     row["osv_url"],
            "nvd_url":     row["nvd_url"],
        })
    return results
