# Documentación de QA y pruebas — AstroKid.Tests

Fuente canónica de **casos manuales**, **planes de prueba de caja negra**, **COPPA** y **ops de QA**.
Las guías de producto, arquitectura y compliance de proveedores siguen en cada repo de código.

## Estrategia y pirámide

| Doc | Contenido |
| --- | --- |
| [TEST_STRATEGY.md](TEST_STRATEGY.md) | Dónde vive cada capa (unit vs caja negra), puertas CI, datos sintéticos |
| [UBIKA_TEST_PYRAMID.md](UBIKA_TEST_PYRAMID.md) | Pirámide Ubika (otro producto en este monorepo de tests) |
| [COPPA_REQUIREMENTS.md](COPPA_REQUIREMENTS.md) | Requisitos COPPA ↔ pruebas automatizadas |

## Casos manuales / E2E

| Doc | Contenido |
| --- | --- |
| [casos/LOGIN_ONBOARDING.md](casos/LOGIN_ONBOARDING.md) | Firebase login + onboarding de padres (web QA) |
| [casos/ESCUELA.md](casos/ESCUELA.md) | Licencia escolar: admin, coordinador, padre |
| [casos/FAMILY_MAPS_SMOKE.md](casos/FAMILY_MAPS_SMOKE.md) | Smoke ~5 min mapas Empatía / Resiliencia |
| [casos/HACIENDA_FACTURACION.md](casos/HACIENDA_FACTURACION.md) | Escenarios facturación electrónica (ONVO + Hacienda) |
| [casos/REGISTRO_USUARIOS_QA.md](casos/REGISTRO_USUARIOS_QA.md) | Aprovisionamiento Proton: coordinador, free, escolar, premium |

## Auth (OAuth / OIDC)

| Doc | Contenido |
| --- | --- |
| [auth/OAUTH_OIDC_TEST_PLAN.md](auth/OAUTH_OIDC_TEST_PLAN.md) | Plan SDET OAuth 2.0 / OIDC (`astrokid-auth`) |
| [auth/IMPLEMENTACION_TESTS.md](auth/IMPLEMENTACION_TESTS.md) | Cómo implementar; E2E caja negra en `UI.Tests` |

## Ops de entorno QA

| Doc | Contenido |
| --- | --- |
| [qa/RESET_DATABASE.md](qa/RESET_DATABASE.md) | Vaciar Postgres / Firebase QA (script en `astro-kid-backend`) |

## Suites en este repo

Ver el [README raíz](../README.md): `API.Tests`, `Web.E2E`, `UI.Tests`, `Mobile.E2E`.

## Qué no vive aquí

| Tema | Dónde queda |
| --- | --- |
| Unit / integración en proceso (pytest, Jest) | `astro-kid-backend/tests`, `astro-kid-web/**/__tests__`, `astrokid-auth/tests` |
| Arquitectura, DPA, retención, Risk-by-Design | Docs del repo de producto correspondiente |
| Informe puntual de salud móvil | `astro-kid-web/docs/MOBILE_HEALTH_CHECK.md` (auditoría, no guion de regresión) |
