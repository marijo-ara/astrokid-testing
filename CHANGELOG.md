# Changelog - Mejoras en Tests

## [2026-10] - Pirámide de pruebas: caja negra centralizada + COPPA

### ✨ Agregado
- **`Web.E2E/`** — suite Playwright TS movida desde `astro-kid-web/apps/web/tests` (config, page objects, specs smoke/e2e/accesibilidad/performance)
- **`Web.E2E/specs/privacy/coppa-web.spec.ts`** — sin trackers antes del opt-in ni en rutas infantiles; política con IA apagada y cargo US$0.50; enlace email-plus falso rechazado
- **`Mobile.E2E/`** — sandbox Appium movido desde `astro-kid-web/apps/mobile-tests` (sin `chromedriver.exe`)
- **`API.Tests/Coppa/CoppaTests.cs`** — 12 casos COPPA-01..10 (email-plus, permiso de IA, cargo, webhook falso, revocación, insights locales, voz)
- **`API.Tests/Health/HealthSmokeTests.cs`** — portado de `test_qa_endpoints.py`
- **`UI.Tests/AuthOAuthFlowTests.cs`** — flujo OAuth en navegador portado de `astrokid-auth`
- `BaseApiTest`: `QaEmail`, `LoginParentWithConsentAsync`, `CompleteEmailPlusAsync`, `CreateConsentedFamilyAsync`; `AstroKidClient.SendAsync` con headers
- Pipeline: paso **API COPPA** bloqueante; job **Web E2E**; `AUTH_BASE_URL` para UI
- Docs: `docs/TEST_STRATEGY.md`, `docs/COPPA_REQUIREMENTS.md` (mapa de datos + matriz de trazabilidad)

### 🔧 Mejorado
- **`WalletTests`** reescrito con adulto y sesión de niño reales (antes llamaba sin token y esperaba 200)
- `MissionFlowTests`, `FamilyProfilesTests`: el adulto que crea la familia es el del token (antes 403 → omitidas en silencio)
- Rutas `/family-profiles/` con barra final (evita el redirect 307); `parental_consent_acknowledged` en los payloads
- Edad inválida de prueba: 14 (el rango del producto es 6–12)
- DPE, Expression, Safety: login con consentimiento email-plus

## [2026-03] - P0 SDET harden (secrets, Smoke, Expression, Safety)

### ✨ Agregado
- **`API.Tests/Expression/ExpressionTests.cs`** — bootstrap expression + `familyMapAnswers` persist + strip `transcript` (COPPA)
- **`API.Tests/Safety/SafetyEventsTests.cs`** — historial vacío, active-lock unlocked, auth required, acknowledge 404
- **`UI.Tests/TestCredentials.cs`** — `ASTROKID_UI_EMAIL` / `ASTROKID_UI_PASSWORD` (sin secrets en código)
- Categorías **`[Category("Smoke")]`** en Auth, MissionFlow, Expression, Safety, FamilyMaps UI
- Pipeline: job **API Smoke** fail-hard; full API **excluye Learning**; UI usa env secrets

### 🔧 Mejorado
- Fix compile `DashboardPage.TryAnswerFamilyMapPendingAsync` (`HasNotText` string, no Regex)
- `TokenTests` ya no hardcodea password real
- UI login (Parents / Dashboard / FamilyMaps) via `TestCredentials`

### 📋 Manual
- Ver `UI.Tests/MANUAL_SMOKE_FAMILY_MAPS.md` (+ env vars abajo)

## [2026-03] - Family maps parent smoke

### ✨ Agregado
- **`UI.Tests/MANUAL_SMOKE_FAMILY_MAPS.md`** — checklist manual ~5 min (dashboard pending + mapas Empatía/Resiliencia)
- **`UI.Tests/FamilyMapsSmokeTests.cs`** — 3 smokes Playwright (superficie, abrir Empatía, responder pending si existe)
- Locators MVP en `DashboardPage` (`family-map-pending-prompt`, `family-map-survey-progress`, open Empathy map)

### 🔧 Relacionado (astro-kid-web / shared)
- Unit tests `familyMapProfile` alineados con status `completed` del día y imports ESM

## [2024] - Mejoras Completas

### ✅ Eliminado
- `API.Tests/UnitTest1.cs` - Archivo placeholder eliminado

### ✨ Agregado
- **Tests de UI mejorados**:
  - `UI.Tests/DashboardTests.cs` - 3 nuevos tests para el dashboard
  - `UI.Tests/LandingPageTests.cs` - 4 nuevos tests para la página de inicio
  - `UI.Tests/ParentsTests.cs` - Tests completos de login (3 tests)

- **Documentación**:
  - `EXTERNAL_DEPENDENCIES.md` - Documentación completa de dependencias externas
  - `AZURE_PIPELINE_SETUP.md` - Guía de configuración del pipeline
  - `validate-pipeline.ps1` - Script de validación del pipeline

### 🔧 Mejorado
- **BaseApiTest.cs**:
  - Sistema de cleanup automático de recursos creados
  - Helpers de validación robustos:
    - `AssertValidJsonResponse()` - Valida JSON y propiedades requeridas
    - `AssertErrorResponse()` - Valida respuestas de error
    - `AssertStatusCode()` - Valida códigos HTTP específicos
    - `AssertSuccessStatusCode()` - Valida códigos 2xx
  - `RegisterResourceForCleanup()` - Registra recursos para limpieza automática

- **TokenTests.cs**:
  - Ahora hereda de `BaseApiTest`
  - Agregados 3 tests adicionales para casos de error
  - Validaciones mejoradas

- **ParentsTests.cs** (anteriormente Parents.cs):
  - Test de login completado con validaciones
  - Agregados 2 tests adicionales
  - Renombrado a `ParentsTests` para seguir convenciones

- **ChildrenTests.cs**:
  - Uso de nuevas validaciones robustas
  - Registro automático de recursos para cleanup

- **AuthTests.cs**:
  - Validación mejorada de respuestas de error

- **azure-pipelines.yml**:
  - Separación de tests de API y UI
  - Instalación de Playwright browsers
  - Configuración de variables de entorno
  - Publicación de cobertura de código mejorada
  - Manejo de errores mejorado

- **UI.Tests.csproj**:
  - Versiones de paquetes actualizadas para consistencia
  - NUnit 4.4.0 (igual que API.Tests)
  - Microsoft.NET.Test.Sdk 18.0.1

### 📝 Documentación
- README.md actualizado con mejoras recientes
- Ejemplos de uso de nuevas funcionalidades
- Enlaces a documentación adicional

## Validación del Pipeline

### Requisitos
- ✅ Compilación exitosa sin errores
- ✅ Pipeline YAML válido
- ✅ Variables de entorno documentadas
- ✅ Script de validación creado

### Configuración Necesaria en Azure DevOps

Variables requeridas:
- `ASTROKID_BASE_URL` (obligatoria)
- `BASE_URL` (opcional, para UI tests)
- `ASTROKID_ENV` (opcional, default: QA)

### Próximos Pasos
1. Configurar variables en Azure DevOps
2. Ejecutar el pipeline
3. Verificar que todos los tests pasen

## Notas

- Los warnings en archivos de Learning son normales (son ejercicios de aprendizaje)
- Los tests de UI pueden fallar si el frontend no está disponible (configurado con `continueOnError: true`)
- Los tests de Firebase requieren `ALLOW_UNVERIFIED_FIREBASE=true` en el backend

