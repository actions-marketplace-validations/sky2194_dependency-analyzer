# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest (feature/ai-fixes) | ✅ |

## Data Handling

**Your manifest is never stored.**

When you upload a `package.json`, `requirements.txt`, or `pom.xml`:

- The file is parsed in-memory on the backend
- CVE lookups are made directly to OSV and NVD APIs
- No package names, filenames, registry URLs, or version constraints are persisted
- No telemetry, no analytics on package data
- The backend logs only HTTP status codes and aggregate CVE counts for uptime monitoring

## Reporting a Vulnerability

If you discover a security vulnerability in DepAnalyzer, please **do not open a public GitHub issue.**

Report it privately to: **[open an issue marked "Security" and we will respond within 48h]**

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We aim to acknowledge reports within **48 hours** and resolve confirmed vulnerabilities within **14 days**.

## CVE Data Sources

- **Primary:** [OSV (Open Source Vulnerabilities)](https://osv.dev) — updated continuously
- **Fallback:** [NVD (National Vulnerability Database)](https://nvd.nist.gov) — rate-limited without API key

## Scope

In scope:
- XSS, injection, authentication bypass on the hosted instance
- Data leakage of user-uploaded manifests
- CVE data integrity (false negatives on known vulnerabilities)

Out of scope:
- Rate limiting bypass (known limitation, mitigated in-memory)
- Self-hosted instances running without TLS
