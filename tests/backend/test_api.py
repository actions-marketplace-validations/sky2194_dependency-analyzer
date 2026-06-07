"""
API endpoint tests — requires Flask server running on port 5000.
Run: pytest tests/backend/test_api.py -v
"""
import pytest
import requests

BASE = 'http://localhost:5000'

def server_running():
    try:
        requests.get(f"{BASE}/api/health", timeout=3)
        return True
    except Exception:
        return False

skip_if_offline = pytest.mark.skipif(not server_running(), reason="Backend server not running on port 5000")

# ── Health ────────────────────────────────────────────────────────────────────

@skip_if_offline
def test_health_endpoint():
    res = requests.get(f"{BASE}/api/health", timeout=5)
    assert res.status_code == 200
    assert res.json()['status'] == 'ok'

# ── Analyze ───────────────────────────────────────────────────────────────────

NPM_PAYLOAD = {
    "content": '{"name":"test-app","version":"1.0.0","dependencies":{"express":"4.17.1","lodash":"4.17.11"}}',
    "filename": "package.json"
}

PYPI_PAYLOAD = {
    "content": "Django==3.2.0\nrequests==2.28.0",
    "filename": "requirements.txt"
}

MAVEN_PAYLOAD = {
    "content": """<project><groupId>com.example</groupId><artifactId>test</artifactId><version>1.0.0</version>
    <dependencies><dependency><groupId>log4j</groupId><artifactId>log4j</artifactId><version>1.2.17</version></dependency></dependencies></project>""",
    "filename": "pom.xml"
}

@skip_if_offline
def test_analyze_npm_returns_200():
    res = requests.post(f"{BASE}/api/analyze", json=NPM_PAYLOAD, timeout=30)
    assert res.status_code == 200

@skip_if_offline
def test_analyze_npm_has_required_fields():
    res = requests.post(f"{BASE}/api/analyze", json=NPM_PAYLOAD, timeout=30)
    data = res.json()
    for field in ['ecosystem', 'project_name', 'total_packages', 'graph', 'vulnerabilities', 'mediation']:
        assert field in data, f"Missing field: {field}"

@skip_if_offline
def test_analyze_npm_correct_project_name():
    res = requests.post(f"{BASE}/api/analyze", json=NPM_PAYLOAD, timeout=30)
    assert res.json()['project_name'] == 'test-app'

@skip_if_offline
def test_analyze_npm_correct_ecosystem():
    res = requests.post(f"{BASE}/api/analyze", json=NPM_PAYLOAD, timeout=30)
    assert res.json()['ecosystem'] == 'npm'

@skip_if_offline
def test_analyze_npm_graph_has_root():
    res = requests.post(f"{BASE}/api/analyze", json=NPM_PAYLOAD, timeout=30)
    graph = res.json()['graph']
    assert graph['name'] == 'test-app'
    assert graph['type'] == 'root'

@skip_if_offline
def test_analyze_npm_vulnerabilities_is_list():
    res = requests.post(f"{BASE}/api/analyze", json=NPM_PAYLOAD, timeout=30)
    assert isinstance(res.json()['vulnerabilities'], list)

@skip_if_offline
def test_analyze_pypi_returns_200():
    res = requests.post(f"{BASE}/api/analyze", json=PYPI_PAYLOAD, timeout=30)
    assert res.status_code == 200

@skip_if_offline
def test_analyze_pypi_correct_ecosystem():
    res = requests.post(f"{BASE}/api/analyze", json=PYPI_PAYLOAD, timeout=30)
    assert res.json()['ecosystem'] == 'pypi'

@skip_if_offline
def test_analyze_maven_returns_200():
    res = requests.post(f"{BASE}/api/analyze", json=MAVEN_PAYLOAD, timeout=30)
    assert res.status_code == 200

@skip_if_offline
def test_analyze_maven_correct_ecosystem():
    res = requests.post(f"{BASE}/api/analyze", json=MAVEN_PAYLOAD, timeout=30)
    assert res.json()['ecosystem'] == 'maven'

@skip_if_offline
def test_analyze_empty_content_returns_400():
    res = requests.post(f"{BASE}/api/analyze", json={"content": "", "filename": "package.json"}, timeout=10)
    assert res.status_code == 400

@skip_if_offline
def test_analyze_invalid_json_returns_400():
    res = requests.post(f"{BASE}/api/analyze", json={"content": "not json {{", "filename": "package.json"}, timeout=10)
    assert res.status_code == 400

# ── Search ────────────────────────────────────────────────────────────────────

@skip_if_offline
def test_oversized_content_returns_413():
    big_content = '{"name":"test","dependencies":{' + ','.join([f'"pkg{i}":"1.0.0"' for i in range(5000)]) + '}}'
    res = requests.post(f"{BASE}/api/analyze", json={"content": big_content, "filename": "package.json"}, timeout=10)
    assert res.status_code == 413, f"Expected 413 for oversized content, got {res.status_code}"

@skip_if_offline
def test_invalid_json_body_returns_400():
    res = requests.post(f"{BASE}/api/analyze", data="not json", headers={"Content-Type": "application/json"}, timeout=5)
    assert res.status_code == 400

@skip_if_offline
def test_cve_invalid_format_returns_400():
    res = requests.get(f"{BASE}/api/cve/NOT-A-CVE", timeout=5)
    assert res.status_code == 400

@skip_if_offline
def test_health_shows_rate_limit_info():
    res = requests.get(f"{BASE}/api/health", timeout=5)
    data = res.json()
    assert 'rate_limit' in data
    assert 'max_file_size' in data
    assert 'allowed_origins' in data

@skip_if_offline
def test_vulns_sorted_by_severity():
    res = requests.post(f"{BASE}/api/analyze", json=MAVEN_PAYLOAD, timeout=60)
    if res.status_code == 200:
        vulns = res.json().get('vulnerabilities', [])
        if len(vulns) > 1:
            sev_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}
            for i in range(len(vulns) - 1):
                assert sev_order.get(vulns[i]['severity'], 3) <= sev_order.get(vulns[i+1]['severity'], 3)

@skip_if_offline
def test_analyze_returns_scan_timestamp():
    res = requests.post(f"{BASE}/api/analyze", json=NPM_PAYLOAD, timeout=60)
    if res.status_code == 200:
        assert 'scan_timestamp' in res.json()

# ── EPSS / KEV fields ─────────────────────────────────────────────────────────

@skip_if_offline
def test_analyze_vulnerabilities_have_epss_fields():
    res = requests.post(f"{BASE}/api/analyze", json=MAVEN_PAYLOAD, timeout=60)
    assert res.status_code == 200
    vulns = res.json().get('vulnerabilities', [])
    for v in vulns:
        assert 'epss_score' in v, f"Missing epss_score on {v.get('cve_id')}"
        assert 'epss_percentile' in v, f"Missing epss_percentile on {v.get('cve_id')}"
        assert 'in_kev' in v, f"Missing in_kev on {v.get('cve_id')}"

@skip_if_offline
def test_analyze_epss_score_is_float_or_none():
    res = requests.post(f"{BASE}/api/analyze", json=MAVEN_PAYLOAD, timeout=60)
    assert res.status_code == 200
    for v in res.json().get('vulnerabilities', []):
        score = v.get('epss_score')
        assert score is None or isinstance(score, float), f"epss_score should be float or None, got {type(score)}"

@skip_if_offline
def test_analyze_in_kev_is_bool():
    res = requests.post(f"{BASE}/api/analyze", json=MAVEN_PAYLOAD, timeout=60)
    assert res.status_code == 200
    for v in res.json().get('vulnerabilities', []):
        assert isinstance(v.get('in_kev'), bool), f"in_kev should be bool, got {type(v.get('in_kev'))}"

# ── Scan snapshots (GET /api/scans/<id>) ──────────────────────────────────────

@skip_if_offline
def test_get_scan_invalid_uuid_returns_400():
    res = requests.get(f"{BASE}/api/scans/not-a-valid-uuid", timeout=5)
    assert res.status_code == 400
    assert 'error' in res.json()

@skip_if_offline
def test_get_scan_nonexistent_id_returns_404():
    res = requests.get(f"{BASE}/api/scans/00000000-0000-0000-0000-000000000000", timeout=5)
    assert res.status_code == 404
    assert 'error' in res.json()

@skip_if_offline
def test_get_scan_roundtrip():
    scan_res = requests.post(f"{BASE}/api/analyze", json=NPM_PAYLOAD, timeout=60)
    assert scan_res.status_code == 200
    data = scan_res.json()
    tx_id = data.get('transaction_id')
    assert tx_id, "analyze response missing transaction_id"

    fetch_res = requests.get(f"{BASE}/api/scans/{tx_id}", timeout=10)
    assert fetch_res.status_code == 200
    fetched = fetch_res.json()
    assert fetched['ecosystem'] == data['ecosystem']
    assert fetched['project_name'] == data['project_name']
    assert fetched['transaction_id'] == tx_id

@skip_if_offline
def test_get_scan_result_has_graph_and_dependency_tree():
    scan_res = requests.post(f"{BASE}/api/analyze", json=NPM_PAYLOAD, timeout=60)
    assert scan_res.status_code == 200
    tx_id = scan_res.json().get('transaction_id')
    assert tx_id

    fetch_res = requests.get(f"{BASE}/api/scans/{tx_id}", timeout=10)
    assert fetch_res.status_code == 200
    fetched = fetch_res.json()
    assert 'graph' in fetched, "Snapshot missing graph"
    assert 'dependency_tree' in fetched, "Snapshot missing dependency_tree"
