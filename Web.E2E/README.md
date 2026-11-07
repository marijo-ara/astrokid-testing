# Web.E2E — black-box Playwright suite for the AstroKid web app

Moved from `astro-kid-web/apps/web/tests` (October 2026). The suite drives the
web app through a browser only; it never imports app code. Unit and component
tests (Jest) stay in `astro-kid-web`.

## Layout

| Folder | What it covers |
| --- | --- |
| `specs/smoke` | Landing load, plus parent plan, school license, and admin school list when the QA accounts are set |
| `specs/e2e` | Inicio de sesión del padre, inicio de desarrollo, padre → niño, recorrido, y los tres roles de la licencia escolar con la API simulada. El guion manual contra QA (crear la escuela, acuerdo, coordinador en `/escuela`, padre en `/access`) está en [`docs/casos/ESCUELA.md`](../docs/casos/ESCUELA.md) |
| `specs/privacy` | COPPA checks: no trackers before consent or on child routes, policy text, email-plus link |
| `specs/accessibility` | WCAG checks (labels, focus, contrast) |
| `specs/performance` | Core Web Vitals and load budgets |
| `pages`, `fixtures`, `helpers`, `config` | Page objects and shared setup |

## Run

Local secrets live in `Web.E2E/.env.local`. Git ignores that file. Playwright loads it on startup, and a variable already set in the shell wins. Leave every secret empty in git; paste `VERCEL_QA_PASSWORD` on your machine.

```powershell
cd Web.E2E
npm install
npx playwright install --with-deps chromium

# Against a deployed environment
$env:PLAYWRIGHT_ENV = "qa"            # localhost | dev | qa | staging | prod
npm run test:smoke

# Parent, school family, and AstroKid admin. Without these, those three tests skip.
# Same person can fill parent and school if that family is the school one.
$env:SMOKE_PARENT_EMAIL = "padre@..."
$env:SMOKE_PARENT_PASSWORD = "..."
$env:SMOKE_PARENT_PLAN = "free_capped"   # or institutional_capped, premium_unlimited
$env:SMOKE_SCHOOL_EMAIL = "familia-escolar@..."
$env:SMOKE_SCHOOL_PASSWORD = "..."
$env:SMOKE_ADMIN_EMAIL = "admin@..."
$env:SMOKE_ADMIN_PASSWORD = "..."
$env:SMOKE_SCHOOL_NAME = "Colegio Norte"

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
- `simple-test.spec.ts` is now `specs/smoke/landing-heading.spec.ts`.
