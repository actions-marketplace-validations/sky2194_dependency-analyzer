"""
seed.py — One-time DB seed: download full OSV dumps + EPSS + KEV.
Run once after setting up the DB. Takes 3-5 minutes.
Usage: cd backend && python3 sync/seed.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def load_env():
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    os.environ.setdefault(k.strip(), v.strip())
load_env()

import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

if __name__ == "__main__":
    log.info("=== DepAnalyzer DB Seed ===")

    from db import init_schema
    log.info("Initialising schema...")
    init_schema()

    from osv_sync import sync_all
    log.info("Syncing OSV (npm + PyPI + Maven) — this takes 3-5 minutes...")
    total = sync_all()
    log.info(f"OSV done: {total} records")

    from epss_kev_sync import sync_epss, sync_kev
    log.info("Syncing EPSS scores...")
    sync_epss()
    log.info("Syncing CISA KEV list...")
    sync_kev()

    log.info("=== Seed complete. DB is ready. ===")
