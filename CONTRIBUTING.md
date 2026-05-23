# Contributing to DepAnalyzer

Thank you for contributing to an open-source security tool.

## Before You Start

- Check [open issues](https://github.com/sky2194/dependency-analyzer/issues) to avoid duplicate work
- For large changes, open an issue first to discuss the approach
- Security-related changes require extra care — see [SECURITY.md](SECURITY.md)

## Development Setup

```bash
git clone https://github.com/sky2194/dependency-analyzer.git
cd dependency-analyzer
chmod +x start.sh
./start.sh
```

See [README.md](README.md) for full setup instructions.

## Branching

```
main              → production
feature/ai-fixes  → active development
feature/*         → your feature branch
fix/*             → bug fixes
```

Always branch from `feature/ai-fixes` (active development branch).

## Pull Request Guidelines

1. **Keep PRs small** — one feature or fix per PR
2. **No regressions** — run `pytest tests/` and `npx playwright test` before submitting
3. **No mock data fallback** — never silently substitute fake scan results for real ones
4. **No hardcoded secrets** — use `os.environ.get()` for all API keys
5. **Preserve API contract** — the frontend-backend contract is validated by `validateSnapshot.js`

## Code Standards

**Backend (Python):**
- Input sanitisation via `utils/validation.py` for all user-supplied strings
- Rate-limit new endpoints via the `@rate_limited` decorator
- Return structured errors: `{"error": "...", "code": "..."}` with appropriate HTTP status

**Frontend (React):**
- Use CSS variables from `index.css` for all colors, spacing, typography
- No inline `fontSize:`, `fontWeight:`, `fontFamily:` — use class names
- Error states must be explicit — never silently fall back to demo/mock data
- Accessibility: interactive elements need `aria-label`, focus states, keyboard support

## Testing

```bash
# Backend
cd backend && source venv/bin/activate && pytest tests/ -v

# E2E
cd tests && npx playwright test

# Logs
./start.sh logs
```

## Commit Messages

```
feat: add EPSS score column to vulnerability table
fix: resolve pypi parser rejecting >= version specifiers
chore: remove stray test files from backend root
docs: update README with SBOM export instructions
```

## License

By contributing, you agree your contributions are licensed under Apache 2.0.
