# Ubika — pirámide de pruebas

Misma regla que AstroKid (`TEST_STRATEGY.md`): si importa código del producto, vive en el repo de código. Si solo habla HTTP o navegador contra un entorno desplegado, vive aquí.

| Capa | Dónde | Qué cubre | Cuándo |
|------|--------|-----------|--------|
| Unit | `ubika/tests/lib`, `ubika-backend/tests` | Geo, reputación, maps allowlist, PII pública, 401, rate limit, SSRF | Cada MR del repo de código |
| Componente / API in-process | `ubika/tests/api` | Rutas Next sin red | Cada MR |
| Caja negra API | `Ubika.API.Tests` | Next desplegado: `/api/health` sin URL de base, 401, PII, SSRF y 429 de maps, `/docs` en 404 | Post-deploy (`UBIKA_API_BASE_URL`, la web si las rutas viven ahí) |
| Caja negra UI | `Ubika.Web.E2E` | Smoke landing/explorar + puertas `/dashboard` `/admin` | Post-deploy (`UBIKA_WEB_BASE_URL`) |

No hay capa móvil: Ubika es web.

## Correr caja negra

```powershell
# API (omitida / Ignore si no hay URL)
$env:UBIKA_API_BASE_URL = "https://<ubika-api>"
dotnet test Ubika.API.Tests --filter "Category=Smoke"

# Web. En local usá localhost: Next 16 no sirve el JS de desarrollo si el origen es 127.0.0.1.
cd Ubika.Web.E2E
npm install
npx playwright install chromium
$env:UBIKA_WEB_BASE_URL = "http://localhost:3000" # o https://www.ubikacr.app
npm run test:smoke
npm run test:security
```

## Unitarias (repos de código)

```powershell
cd ..\ubika; npm run test:unit
```

La caja negra habla con las rutas de esa misma app Next (`/api/health`, `/api/maps/resolve`, `/api/my-business`). No hay un `/` JSON llamado `ubika-backend`.
