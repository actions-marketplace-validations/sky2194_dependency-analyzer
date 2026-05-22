<div align="center">

<img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square" />
<img src="https://img.shields.io/badge/python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/react-18-61DAFB?style=flat-square&logo=react&logoColor=black" />
<img src="https://img.shields.io/badge/flask-3.0-000000?style=flat-square&logo=flask&logoColor=white" />
<img src="https://img.shields.io/badge/license-Apache%202.0-green?style=flat-square" />

# DepAnalyzer

**Open-source Software Composition Analysis (SCA) tool.**  
Scan your project dependencies for known CVE vulnerabilities — across npm, PyPI, and Maven.

[Live Demo](https://dependency-analyzer-eight.vercel.app) · [Report a Bug](https://github.com/sky2194/dependency-analyzer/issues) · [Request a Feature](https://github.com/sky2194/dependency-analyzer/issues)

</div>

---

## Overview

DepAnalyzer builds a full dependency tree — direct and transitive — and cross-references every package against the **OSV** vulnerability database. It calculates a risk score, highlights exploitable paths, and generates actionable fix commands.

Built for developers who want visibility into their supply chain without enterprise tooling overhead.

---

## Features

| Feature | Description |
|---------|-------------|
| 🌳 **Full dependency tree** | Resolves direct and transitive dependencies up to N levels deep |
| 🔍 **CVE scanning** | Cross-references every package against OSV (Open Source Vulnerabilities) |
| 📊 **Risk score** | Logarithmic severity-weighted score (0–100) with transparent calculation |
| 🗺️ **Dependency graph** | Interactive graph — zoom, pan, click to highlight paths, filter by severity |
| 🔧 **Fix commands** | Per-CVE and batch fix commands in the correct format for each ecosystem |
| 📄 **Export reports** | Download as PDF or CSV |
| 📚 **Scan history** | localStorage-based project workspace — track posture over time |
| 🌐 **Three ecosystems** | npm (`package.json`), PyPI (`requirements.txt`), Maven (`pom.xml`) |

---

## Tech Stack

**Backend**
- Python 3.9+ · Flask 3.0 · Gunicorn
- OSV API for vulnerability data
- ReportLab for PDF generation

**Frontend**
- React 18 · Vite · React Router
- SVG-based dependency graph (no external graph library)
- CSS variables for theming (dark/light)

**Infrastructure**
- Frontend → Vercel
- Backend → DigitalOcean
- Tests → Playwright (E2E) + pytest (backend)

---

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- npm 8+

### Quick Start

```bash
git clone https://github.com/sky2194/dependency-analyzer.git
cd dependency-analyzer
chmod +x start.sh
./start.sh
```

That's it. The script handles virtual environment creation, dependency installation, and starts both services.

```
  ✓  Backend   → http://localhost:5000
  ✓  Frontend  → http://localhost:3000
```

### Start Script Commands

```bash
./start.sh              # Start everything
./start.sh stop         # Stop everything
./start.sh restart      # Restart everything
./start.sh logs         # Tail backend + frontend logs
```

### Manual Setup

<details>
<summary>If start.sh fails, expand for manual steps</summary>

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

**Frontend (new terminal):**
```bash
cd frontend
npm install
npm run dev
```

</details>

### NVD API Key (Optional)

Without a key, NVD fallback is rate-limited to 5 requests/30s. OSV (primary source) has no rate limit.

```bash
cp backend/.env.example backend/.env
# Add your free NVD key from: https://nvd.nist.gov/developers/request-an-api-key
```

---

## Usage

1. Open `http://localhost:3000`
2. Upload your dependency manifest (`package.json`, `requirements.txt`, or `pom.xml`)
3. Click **Scan & Detect Vulnerabilities**
4. Review results — risk score, CVE list, dependency graph, fix commands
5. Export as PDF or CSV

### Supported File Formats

| Ecosystem | File |
|-----------|------|
| npm | `package.json`, `package-lock.json` |
| PyPI | `requirements.txt`, `Pipfile` |
| Maven | `pom.xml` |

---

## Project Structure

```
dependency-analyzer/
├── backend/
│   ├── app.py                  # Flask API — routes, rate limiting, orchestration
│   ├── parsers/
│   │   ├── npm_parser.py       # package.json parser
│   │   ├── pypi_parser.py      # requirements.txt parser
│   │   └── maven_parser.py     # pom.xml parser
│   ├── resolvers/
│   │   ├── npm_resolver.py     # npm dependency tree resolution
│   │   ├── pypi_resolver.py    # PyPI dependency tree resolution
│   │   └── maven_resolver.py   # Maven dependency tree resolution
│   ├── cve/
│   │   ├── osv_client.py       # OSV API client (primary)
│   │   ├── nvd_client.py       # NVD API client (fallback)
│   │   └── scanner.py          # Vulnerability scanner
│   ├── export/
│   │   ├── pdf_export.py       # PDF report generation (ReportLab)
│   │   └── csv_export.py       # CSV export
│   ├── utils/
│   │   ├── validation.py       # Input sanitisation
│   │   └── circuit_breaker.py  # API circuit breaker
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Landing.jsx     # Landing page
│       │   ├── Dashboard.jsx   # Scanner page
│       │   ├── Analytics.jsx   # Results page
│       │   ├── Learn.jsx       # Knowledge base
│       │   ├── History.jsx     # Scan history
│       │   └── Compare.jsx     # Scan comparison
│       ├── components/
│       │   ├── DependencyGraph.jsx  # Interactive SVG graph
│       │   ├── FileUpload.jsx       # File upload + ecosystem detection
│       │   └── Tooltip.jsx          # Glossary tooltips
│       └── utils/
│           ├── projectStore.js      # localStorage scan history
│           └── fixAll.js            # Batch fix command generator
├── tests/
│   ├── tests/                  # Playwright E2E tests
│   ├── backend/                # pytest backend tests
│   └── utils/                  # Test helpers
└── start.sh                    # Cross-platform start script
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/scan` | Scan a dependency manifest file |
| `POST` | `/api/scan-package` | Scan a single package by name + version |
| `GET` | `/api/cve/<cve_id>` | Get details for a specific CVE |
| `POST` | `/api/export/pdf` | Generate PDF report |
| `POST` | `/api/export/csv` | Generate CSV report |
| `GET` | `/api/health` | Health check |

---

## Risk Score

The risk score (0–100) uses an exponential decay model — each additional CVE of the same severity contributes less than the previous one:

```
Critical  = 40 × (1 − e^(−count/3))
High      = 30 × (1 − e^(−count/5))
Medium    = 20 × (1 − e^(−count/8))
Low       = 10 × (1 − e^(−count/10))

Score = min(100, round(sum of all impacts))
```

| Range | Label |
|-------|-------|
| 0–39 | Low |
| 40–69 | Medium |
| 70–89 | High |
| 90–100 | Critical |

---

## Running Tests

**Backend (pytest):**
```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

**E2E (Playwright):**
```bash
cd tests
npm install
npx playwright test
```

**Logs:**
```bash
./start.sh logs
```

---

## Troubleshooting

**Port already in use:**
```bash
./start.sh restart
```

**Backend won't start:**
```bash
./start.sh logs         # check backend log
rm -rf backend/venv     # nuclear option — recreate venv
./start.sh
```

**Frontend won't start:**
```bash
./start.sh logs         # check frontend log
rm -rf frontend/node_modules
./start.sh
```

---

## Known Limitations

- **Reachability** — CVEs are flagged based on package version, not whether the vulnerable code path is reachable in your app
- **Transitive depth** — resolves up to 3 levels deep for npm, 2 for PyPI/Maven
- **Rate limiting** — in-memory only, resets on server restart (use Redis for production)
- **No auth** — stateless, localStorage-based history only

---

## License

Apache License 2.0 — see [LICENSE](LICENSE) for details.
