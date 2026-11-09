# Web.E2E — black-box Playwright suite for the AstroKid web app

Moved from `astro-kid-web/apps/web/tests` (October 2026). The suite drives the
web app through a browser only; it never imports app code. Unit and component
tests (Jest) stay in `astro-kid-web`.

## Layout

Carpetas y archivos van **prefijados 01–24** para que la UI de Playwright ordene las suites de arriba abajo (el `test.describe` repite el mismo número).

| # | Carpeta / archivo | Qué cubre |
| --- | --- | --- |
| 01–06 | `specs/01-provisioning/` | Provisioning QA: Firebase, admin, coordinador, familias — [`REGISTRO_USUARIOS_QA.md`](../docs/casos/REGISTRO_USUARIOS_QA.md) |
| 07–10 | `specs/07-smoke/` | Landing, dashboard, licencia escolar con cuentas QA |
| 11–18 | `specs/11-e2e/` | Login, recorridos, licencia escolar (API simulada) — [`ESCUELA.md`](../docs/casos/ESCUELA.md) |
| 19–20 | `specs/19-privacy/` | COPPA y consentimiento Premium / IA |
| 21–22 | `specs/21-accessibility/` | WCAG y accesibilidad + rendimiento |
| 23–24 | `specs/23-performance/` | Presupuestos de carga y Core Web Vitals |

| `pages`, `fixtures`, `helpers`, `config` | Page objects y setup compartido |

**Quién ejecuta cada prueba (Admin, Familia Free, visitante, mock):** [`docs/casos/E2E_ACTORES_QA.md`](../docs/casos/E2E_ACTORES_QA.md) — en Playwright, anotación `qa-actor` en el reporte.

## Run

Local secrets live in `Web.E2E/.env.local`. Git ignores that file. Playwright loads it on startup, and a variable already set in the shell wins. Leave every secret empty in git; paste `VERCEL_QA_PASSWORD` on your machine.

```powershell
cd Web.E2E
npm install
npx playwright install --with-deps chromium

# Against a deployed environment
$env:PLAYWRIGHT_ENV = "qa"            # localhost | dev | qa | staging | prod
npm run test:smoke
npm run test:provisioning   # REGISTRO_SUITE_PASSWORD + SMOKE_ADMIN_*; paso 1 solo asegura cuentas

# Cuentas QA (provisioning Proton). Ver config/qaTestAccounts.ts.
# Mínimo: REGISTRO_SUITE_PASSWORD tras npm run test:provisioning.
# Opcional: overrides SMOKE_PARENT_*, SMOKE_SCHOOL_* (familia escolar), SMOKE_ADMIN_*, SMOKE_COORDINATOR_*, SMOKE_PREMIUM_*.
$env:REGISTRO_SUITE_PASSWORD = "..."
$env:SMOKE_PARENT_EMAIL = "astrokid.io@proton.me"
$env:SMOKE_PARENT_PASSWORD = "..."  # mismo que suite si querés ser explícito
$env:SMOKE_PARENT_PLAN = "free_capped"   # or institutional_capped, premium_unlimited
$env:SMOKE_SCHOOL_EMAIL = "familia-escolar@..."
$env:SMOKE_SCHOOL_PASSWORD = "..."
$env:SMOKE_ADMIN_EMAIL = "admin@..."
$env:SMOKE_ADMIN_PASSWORD = "..."
$env:SMOKE_SCHOOL_NAME = "Colegio Norte"

# Login real en QA (parent-login-flow, smoke padre): mismo par que licencia escolar
$env:SMOKE_PARENT_EMAIL = "padre@..."
$env:SMOKE_PARENT_PASSWORD = "..."

# Against any URL
$env:PLAYWRIGHT_BASE_URL = "https://astro-kid-web-qa.vercel.app"
npm test

# Local: start astro-kid-web yourself with NEXT_PUBLIC_PLAYWRIGHT_E2E=true,
# or let Playwright start it
$env:WEB_APP_DIR = "C:\Users\Test\Documents\Gitlab\astro-kid-web\apps\web"
$env:PLAYWRIGHT_BASE_URL = "http://localhost:3000"
npm run test:e2e
```

| Variable | Use |
| --- | --- |
| `PLAYWRIGHT_BASE_URL` | Web URL under test (wins over `PLAYWRIGHT_ENV`) |
| `PLAYWRIGHT_ENV` | Named environment in `config/environments.ts` |
| `ASTROKID_BASE_URL` | Backend URL for specs that call or stub the API |
| `WEB_APP_DIR` | Optional path to `astro-kid-web/apps/web`; starts `npm run dev` |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Vercel preview protection bypass |
| `VERCEL_QA_PASSWORD` | Vercel password protection; global setup unlocks it once and reuses the cookie |
| `PLAYWRIGHT_BROWSERS=all` | Full browser matrix (nightly) |

Tags: `@coppa` marks the privacy requirements in `docs/COPPA_REQUIREMENTS.md`.
Run them with `npx playwright test --grep @coppa`.

## Removed during the move

- `tests/test.spec.ts`: called a non-existent page method on google.com.
- `tests/api/auth-api.spec.ts`: dev-login + family create + by-email are covered
  by `API.Tests/Auth` and `API.Tests/FamilyProfiles` (one API framework).
- `simple-test.spec.ts` is now `specs/07-smoke/07-landing-heading.spec.ts`.
