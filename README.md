# AstroKid.Tests — pruebas de caja negra

Pruebas que hablan con AstroKid solo por HTTP o navegador, contra un entorno desplegado.
Las pruebas unitarias y de componente viven en cada repo de código.
Estrategia completa: [`docs/TEST_STRATEGY.md`](docs/TEST_STRATEGY.md).
Requisitos COPPA y trazabilidad: [`docs/COPPA_REQUIREMENTS.md`](docs/COPPA_REQUIREMENTS.md).

| Carpeta | Qué contiene | Stack |
| --- | --- | --- |
| `API.Tests` | Contratos del backend: auth, familias, misiones, wallet, seguridad, COPPA, health | C# .NET 9, NUnit, RestSharp |
| `UI.Tests` | Panel de adultos y flujo OAuth del servidor auth | C# Playwright |
| `Web.E2E` | Web Next.js: smoke, E2E, privacidad, accesibilidad, performance | Playwright TS |
| `Mobile.E2E` | Appium (sandbox) | WebdriverIO + Serenity |
| `Core` | Cliente HTTP y configuración compartida | C# |

## Variables

| Variable | Para |
| --- | --- |
| `ASTROKID_BASE_URL` | Backend bajo prueba (API.Tests, Web.E2E) |
| `BASE_URL` | Web bajo prueba (UI.Tests) |
| `PLAYWRIGHT_BASE_URL` | Web bajo prueba (Web.E2E) |
| `AUTH_BASE_URL` | Servidor astrokid-auth (UI.Tests/AuthOAuthFlowTests) |
| `ASTROKID_UI_EMAIL`, `ASTROKID_UI_PASSWORD` | Login del panel (secretos del pipeline) |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Previews protegidas de Vercel |

El backend QA necesita `COPPA_EMAIL_PLUS_EXPOSE_TOKEN=true` para completar el
consentimiento email-plus desde las pruebas. Esa bandera nunca va en producción.

## Correr

```powershell
dotnet build
$env:ASTROKID_BASE_URL = "https://<backend-qa>"
dotnet test API.Tests --filter "Category=Smoke"
dotnet test API.Tests --filter "Category=Coppa"
dotnet test API.Tests --filter "FullyQualifiedName!~Learning"

$env:AUTH_BASE_URL = "http://localhost:8001"
dotnet test UI.Tests --filter "FullyQualifiedName~AuthOAuthFlowTests"

cd Web.E2E; npm install; npx playwright install chromium
$env:PLAYWRIGHT_BASE_URL = "https://<web-qa>"
npm run test:smoke
npx playwright test --grep @coppa
```
