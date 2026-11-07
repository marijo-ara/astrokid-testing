# AstroKid — Estrategia de pruebas (pirámide)

Casos manuales, planes OAuth y ops QA: índice en [`docs/README.md`](README.md).

## Regla

| Capa | Qué prueba | Dónde vive | Cuándo corre |
| --- | --- | --- | --- |
| Unit | Una función o regla, sin red ni base real | Repo de código (`astro-kid-backend/tests/unit`, `astro-kid-web/**/__tests__`, `astrokid-auth/tests/unit`) | En cada commit / MR del repo de código |
| Componente / integración en proceso | Varios módulos juntos con `TestClient` o Jest + DOM, base en memoria | Repo de código (`tests/integration`, `tests/e2e` con `TestClient`, `tests/api`) | En cada MR del repo de código |
| Caja negra API | HTTP contra un backend **desplegado** | Este repo: `API.Tests` (C#, NUnit, RestSharp) | Post-deploy (QA) y nightly |
| Caja negra UI | Navegador contra la web o el servidor auth **desplegados** | Este repo: `Web.E2E` (Playwright TS), `UI.Tests` (Playwright C#) | Post-deploy (QA), smoke en prod |
| Móvil | Appium contra el APK | Este repo: `Mobile.E2E` (`npm run test:apk`) | Manual, antes de publicar un APK |
| Ubika unit | Geo, auth, PII, SSRF | `ubika/tests`, `ubika-backend/tests` | MR del repo de código |
| Ubika caja negra API | HTTP contra API desplegada | Este repo: `Ubika.API.Tests` | Post-deploy (`UBIKA_API_BASE_URL`) |
| Ubika caja negra UI | Navegador contra web desplegada | Este repo: `Ubika.Web.E2E` | Post-deploy (`UBIKA_WEB_BASE_URL`) |

Criterio para decidir: si la prueba **importa código del producto** o usa `TestClient`,
se queda en el repo de código. Si solo habla con el sistema por HTTP o navegador, vive aquí.

La base de la pirámide es ancha (backend: ~440 pruebas en proceso) y la punta es corta:
las suites de caja negra cubren contratos, seguridad, COPPA y flujos críticos; no repiten
cada regla de negocio.

## Puertas de calidad

1. **Repo de código, MR**: unit + componente. Debe pasar para merge.
2. **Post-deploy QA** (`azure-pipelines.yml`):
   - `API Smoke` (Category=Smoke) — bloqueante.
   - `API COPPA` (Category=Coppa) — bloqueante. Ver `docs/COPPA_REQUIREMENTS.md`.
   - `API Tests` completo — bloqueante.
   - `Web Smoke + COPPA` (`Web.E2E`, specs `smoke` y `privacy`) — bloqueante cuando `PLAYWRIGHT_BASE_URL` está definido.
   - `UI Tests`, `Web E2E + accesibilidad + performance` — informativos hasta estabilizar.
3. **Prod**: solo smoke de lectura (sin crear datos).

## Qué se movió aquí (octubre 2026)

| Origen | Destino | Nota |
| --- | --- | --- |
| `astro-kid-web/apps/web/tests/**` (Playwright) | `Web.E2E/` | Config nueva, sin servidor local obligatorio |
| `astro-kid-web/apps/web/tests/simple-test.spec.ts` | `Web.E2E/specs/smoke/landing-heading.spec.ts` | |
| `astro-kid-web/apps/mobile-tests/` (Appium) | `Mobile.E2E/` | Sin el `chromedriver.exe` versionado |
| `astro-kid-backend/tests/integration/test_qa_endpoints.py` | `API.Tests/Health/HealthSmokeTests.cs`, `API.Tests/Wallet/WalletTests.cs` | Wallet reescrito con auth real (el C# anterior no enviaba token) |
| `astrokid-auth/tests/e2e/test_flows_playwright.py` | `UI.Tests/AuthOAuthFlowTests.cs` | Claims vía `/userinfo` en vez de importar el código del servidor |

Descartado, con motivo:

- `apps/web/tests/test.spec.ts`: demo rota contra google.com.
- `apps/web/tests/api/auth-api.spec.ts`: duplicaba `API.Tests/Auth` y `API.Tests/FamilyProfiles`.
- Casos “el endpoint responde 200/400/401/403/404” de `test_qa_endpoints.py`: no verifican nada; los
  sustituye `HealthSmokeTests.Main_Endpoints_Never_Return_5xx`.

Eliminado de los repos de código: esos archivos, `playwright.config.ts` (raíz y `apps/web`),
`playwright.ci.config.ts`, los scripts `test:playwright*` / `test:all` de `apps/web/package.json`,
los jobs Playwright de `astro-kid-web/.gitlab-ci.yml`, el job `test_qa_endpoints` del backend y
`scripts/run_qa_tests.py`, y `playwright` de `astrokid-auth/requirements.txt`.

## Datos de prueba

- Correos: `delivered+<etiqueta>-<guid>@resend.dev` (helper `QaEmail`). No rebotan ni llegan a personas.
- Cada suite que crea niños usa un adulto nuevo con email-plus completo
  (`LoginParentWithConsentAsync`, `CreateConsentedFamilyAsync` en `BaseApiTest`).
- Sin email-plus disponible en el entorno, esas pruebas terminan **Inconclusive** con el motivo, no en verde falso.

## Licencias (B2B2C)

| Capa | Dónde | Qué cubre |
| --- | --- | --- |
| Unit | `astro-kid-backend/tests/unit/test_license_plan_switch.py` y `test_entitlements.py` | Free 10 → escuela 100 → revocación en pausa → Premium, en padre, niño y arco Free |
| Integración | `astro-kid-backend/tests/integration/test_b2b2c_school_tiers.py` | Los mismos cambios por HTTP con `TestClient` |
| Caja negra | `API.Tests/Licenses/LicensePyramidTests.cs`, `PilotSignalsContractTests.cs`, `SchoolAgreementContractTests.cs` | Familia nueva en QA es Free (10). Admin y códigos inválidos se rechazan. School desk, soltar un asiento y piloto: 401 sin sesión, 403 si no es contacto o admin. Un enlace de acuerdo desconocido responde 404. Un paquete sin referencia de pago responde 422. No crea escuelas ni escribe respuestas en el backend compartido |
| Web / móvil | `Web.E2E/specs/e2e/school-license-roles.spec.ts`, `specs/smoke/parent-license-school.spec.ts`, `Mobile.E2E/features/smoke/school-child.feature` | Tres roles, el mismo correo no cambia de rol. El spec E2E simula la API: el admin envía el acuerdo, el coordinador ve la licencia activa, el primer nombre, la práctica CASEL, los cuatro marcos y puede revocar la familia; un correo mal formado no entra; un enlace de acuerdo sin token no abre el formulario; la familia canjea en `/access`. El smoke lee el plan de cuentas ya existentes: el admin ve **Activar licencia escolar** y un padre ve **Admin · licencias**. El guion manual está en [`docs/casos/ESCUELA.md`](casos/ESCUELA.md). El niño escolar entra en Android si hay token |

## Pendiente

- `Web.E2E`: `npm run typecheck` reporta errores de tipos heredados (specs de performance usan `page` protegido).
  Playwright los ejecuta igual; conviene limpiarlos.
- `astro-kid-web/.gitlab-ci-optimized*.yml` aún mencionan jobs Playwright; no los incluye `.gitlab-ci.yml`.
- `@playwright/test` sigue en `package.json` del web para no tocar los lockfiles; se puede quitar en un MR aparte.
- `Mobile.E2E` smoke (`features/smoke`, `npm run test:smoke`): el APK abre en la entrada. El niño escolar entra si `ASTROKID_PARENT_TOKEN` y `ASTROKID_BASE_URL` están definidos; el niño del QR se borra al terminar. Sin esas variables el escenario se omite. El flujo largo del QR sigue en `features/child-login`. Corre a mano porque necesita emulador; falta un job con emulador.
