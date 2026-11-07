# Plan de pruebas SDET: OAuth 2.0 y OIDC

> **Canónico en** `AstroKid.Tests/docs/auth/OAUTH_OIDC_TEST_PLAN.md` (movido desde `astrokid-auth/docs/`).

Documento de pruebas para el epic de OAuth 2.0 y OpenID Connect (OIDC) del servicio **astrokid-auth**.

- **Unit / API en proceso:** `astrokid-auth/tests/`
- **E2E caja negra (navegador):** `AstroKid.Tests/UI.Tests/AuthOAuthFlowTests.cs`

---

## Tabla de contenidos

1. [Tests unitarios](#1-tests-unitarios)
2. [Tests de API (integración)](#2-tests-de-api-integración)
3. [Flujo end-to-end](#3-flujo-end-to-end-e2e)
4. [Seguridad y configuración](#4-seguridad-y-configuración)
5. [Priorización](#5-priorización)
6. [Herramientas recomendadas](#6-herramientas-recomendadas)
7. [Cómo ejecutar los tests](#7-cómo-ejecutar-los-tests)

**Guía de implementación:** [IMPLEMENTACION_TESTS.md](IMPLEMENTACION_TESTS.md).

---

## 1. Tests unitarios

### 1.1 `token.py` (servicio de tokens JWT)

| ID | Caso | Pasos | Resultado esperado |
|----|------|-------|--------------------|
| U1 | Access token creado correctamente | `create_access_token(subject="a@b.com", email="a@b.com", name="Test")` | JWT válido con claims `sub`, `email`, `name`, `iss`, `aud`, `iat`, `exp` |
| U2 | Access token expirado | Crear token, esperar `expires_in` minutos, llamar `verify_token()` | `ValueError` (token expirado) |
| U3 | Refresh token con type correcto | `create_refresh_token(subject="a@b.com")` | JWT válido con claim `type: "refresh"` |
| U4 | Token inválido | `verify_token("invalid-xyz")` | `ValueError` |
| U5 | Token manipulado | Crear token, modificar un carácter del JWT, llamar `verify_token()` | `ValueError` |
| U6 | Access token usado como refresh | `verify_token(access_token)` en flujo refresh; verificar `payload.get("type") != "refresh"` | Rechazo / `invalid_grant` |

### 1.2 `oauth_store.py` (almacén de códigos de autorización)

| ID | Caso | Pasos | Resultado esperado |
|----|------|-------|--------------------|
| U7 | Código creado | `create_code(email="a@b.com", name="Test", redirect_uri="...", client_id="x", scope="openid", state=None)` | Devuelve string aleatorio; código existe en store |
| U8 | Consumir código válido | `create_code(...)` → `consume_code(code)` | Devuelve `AuthCode` con los datos correctos; código eliminado del store |
| U9 | Consumir código inexistente | `consume_code("invalid")` | `None` |
| U10 | Consumir código expirado | `create_code(...)`, esperar >10 min, `consume_code(code)` | `None` |
| U11 | Consumir código dos veces | `create_code(...)` → `consume_code(code)` → `consume_code(code)` | Primera: `AuthCode`; segunda: `None` |

---

## 2. Tests de API (integración)

### 2.1 OIDC Discovery y metadatos

| ID | Caso | Request | Assertions |
|----|------|---------|------------|
| I1 | Discovery válido | `GET /.well-known/openid-configuration` | 200; JSON con `issuer`, `authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`, `jwks_uri` |
| I2 | Issuer correcto | `GET /.well-known/openid-configuration` | `issuer` coincide con `AUTH_ISSUER_URL` |
| I3 | JWKS | `GET /.well-known/jwks.json` | 200; `keys` array con objetos que tienen `kty`, `alg`, `use`, `kid` |
| I4 | Scopes soportados | `GET /.well-known/openid-configuration` | `scopes_supported` contiene `openid`, `profile`, `email` |

### 2.2 `/authorize` (GET)

| ID | Caso | Params | Resultado esperado |
|----|------|--------|--------------------|
| I5 | Authorize válido | `response_type=code`, `client_id=X`, `redirect_uri` en whitelist | 200; HTML con formulario; inputs hidden para `response_type`, `client_id`, `redirect_uri`; campos `email`, `name` |
| I6 | redirect_uri no permitida | `redirect_uri=http://evil.com/callback` | 400/401; JSON `error: invalid_redirect_uri` |
| I7 | Parámetros requeridos faltantes | Sin `response_type` o sin `redirect_uri` | 422 Unprocessable Entity |
| I8 | State preservado | Incluir `state=xyz123` | HTML contiene input hidden `state` con valor `xyz123` |
| I9 | PKCE (opcional) | `code_challenge=abc`, `code_challenge_method=S256` | HTML acepta; servidor no falla (PKCE validación opcional) |

### 2.3 `/approve` (POST)

| ID | Caso | Body (form-urlencoded) | Resultado esperado |
|----|------|------------------------|--------------------|
| I10 | Approve correcto | `response_type=code`, `client_id`, `redirect_uri` permitida, `scope`, `state`, `email`, `name` | 302 redirect a `redirect_uri?code=xxx&state=...` |
| I11 | redirect_uri no permitida | `redirect_uri=http://evil.com` | Error; no redirect |
| I12 | Email vacío | `email=` (vacío) | 400/422 |

### 2.4 `/token` (POST)

| ID | Caso | Body (form-urlencoded) | Resultado esperado |
|----|------|------------------------|--------------------|
| I13 | Authorization Code válido | `grant_type=authorization_code`, `code` válido, `redirect_uri` | 200; JSON con `access_token`, `refresh_token`, `token_type=bearer`, `expires_in` |
| I14 | Código inválido | `grant_type=authorization_code`, `code=invalid123` | 400; `error: invalid_grant` |
| I15 | Código ya consumido | Usar mismo `code` dos veces | Primera: 200; segunda: 400 `invalid_grant` |
| I16 | Refresh token válido | `grant_type=refresh_token`, `refresh_token` válido | 200; nuevo `access_token` y `refresh_token` |
| I17 | Refresh token inválido | `grant_type=refresh_token`, `refresh_token=invalid` | 400; `error: invalid_grant` |
| I18 | grant_type no soportado | `grant_type=client_credentials` | 400; `error: unsupported_grant_type` |
| I19 | Sin code en authorization_code | `grant_type=authorization_code` sin `code` | 400; `error: invalid_request` |
| I20 | Sin refresh_token en refresh | `grant_type=refresh_token` sin `refresh_token` | 400; `error: invalid_request` |
| I21 | Access token usado como refresh | `refresh_token` = access_token | 400; `error: invalid_grant` |
| I22 | Claims en access token | Descodificar JWT del access_token | Contiene `sub`, `email`, `name`, `iss`, `aud`, `exp`, `iat` |

### 2.5 `/userinfo` (GET)

| ID | Caso | Headers | Resultado esperado |
|----|------|---------|--------------------|
| I23 | UserInfo con token válido | `Authorization: Bearer <access_token>` | 200; JSON con `sub`, `email`, `name` |
| I24 | Sin Authorization | Sin header | 401 |
| I25 | Token inválido | `Authorization: Bearer invalid` | 401 |
| I26 | Token expirado | `Authorization: Bearer <access_token_expirado>` | 401 |

### 2.6 `/auth/dev-login` (POST)

| ID | Caso | Body (JSON) | Resultado esperado |
|----|------|-------------|--------------------|
| I27 | Dev login correcto | `{"email":"a@b.com","name":"Test"}` | 200; `access_token`, `refresh_token`, `expires_in` |
| I28 | Email inválido | `{"email":"not-an-email"}` | 422 |
| I29 | Dev login deshabilitado | Con `AUTH_ALLOW_DEV_LOGIN=false` | 403 |
| I30 | Sin name | `{"email":"a@b.com"}` | 200; usa parte local del email como `name` |

---

## 3. Flujo end-to-end (E2E)

| ID | Caso | Pasos | Resultado esperado |
|----|------|-------|--------------------|
| E1 | Flujo OAuth completo | 1) `GET /authorize?response_type=code&client_id=X&redirect_uri=...`<br>2) Simular `POST /approve` con credenciales<br>3) `POST /token` con `code` obtenido del redirect | Tokens válidos; backend puede validar el access_token |
| E2 | Flujo refresh completo | 1) Obtener tokens vía dev-login u OAuth<br>2) `POST /token` con `grant_type=refresh_token` y `refresh_token` | Nuevo `access_token` y `refresh_token` |
| E3 | Integración con backend | 1) Obtener access_token (dev-login u OAuth)<br>2) Llamar astro-kid-backend con `Authorization: Bearer <token>` | 200; backend identifica usuario |
| E4 | Discovery + UserInfo | 1) `GET /.well-known/openid-configuration`<br>2) Obtener access_token<br>3) `GET /userinfo` con `Authorization: Bearer <token>` | UserInfo devuelve `sub`, `email`, `name` correctos |

---

## 4. Seguridad y configuración

| ID | Caso | Descripción |
|----|------|-------------|
| S1 | CORS | Requests desde origen no permitido son rechazados |
| S2 | redirect_uri exacta | Solo URIs en `AUTH_ALLOWED_REDIRECT_URIS` aceptadas |
| S3 | JWT secret en producción | `AUTH_JWT_SECRET` no es el valor por defecto |
| S4 | Dev login en producción | `AUTH_ALLOW_DEV_LOGIN=false` en producción |
| S5 | TTL de códigos | Códigos expirados (>10 min) no se aceptan en `/token` |

---

## 5. Priorización

| Prioridad | IDs | Motivo |
|-----------|-----|--------|
| **P0** | I13, I14, I16, I17, I5, I6, E1 | Core OAuth: authorize, token, refresh |
| **P0** | I23, I24, I25 | UserInfo protegido por token |
| **P0** | I1, I2 | Discovery para integración OIDC |
| **P1** | U1–U6, U7–U11 | Servicios críticos: token y oauth_store |
| **P1** | I27, I28, I29 | Dev-login (muy usado en desarrollo) |
| **P1** | I10–I12 | Approve y validación de redirect |
| **P2** | E2, E3, E4 | Flujos E2E completos |
| **P2** | S1–S5 | Auditoría de seguridad |

---

## 6. Herramientas recomendadas

| Tipo | Herramienta |
|------|-------------|
| Framework de tests | pytest |
| Cliente HTTP | httpx o TestClient de FastAPI |
| Async | pytest-asyncio (si hay tests async) |
| E2E (navegador) | Playwright o Selenium |
| CI | pytest en `.gitlab-ci.yml`; E2E en pipeline opcional |

---

## 7. Cómo ejecutar los tests

### Dependencias de test

Añadir a `requirements.txt` o `requirements-dev.txt`:

```
pytest>=7.0.0
httpx>=0.25.0
email-validator>=2.0.0
```

### Comando básico

```bash
cd astrokid-auth
.venv\Scripts\Activate.ps1   # Windows
pip install -r requirements.txt
pytest tests/ -v
```

### Tests implementados

| Tipo | Ubicación | Casos |
|------|-----------|--------|
| Unitarios | `tests/unit/` | U1–U11 (token, oauth_store) |
| API | `tests/api/` | I1–I30 (oidc, authorize, approve, token, userinfo, dev-login) |
| E2E | `tests/e2e/` | E1, E2, E4 (OAuth completo, refresh, discovery+userinfo) |
| E2E Playwright | `AstroKid.Tests/UI.Tests/AuthOAuthFlowTests.cs` | Flujo OAuth en navegador, discovery/docs |
| Seguridad | `tests/security/` | S1–S5 (CORS, redirect_uri, JWT secret, dev-login, TTL) |

```bash
pytest tests/ -v
pytest -m p0 -v
```

### Variables de entorno para tests

Para tests que requieren config específica (por ejemplo I29):

```bash
AUTH_ALLOW_DEV_LOGIN=false pytest tests/test_dev.py -v
```

### Tests por prioridad

```bash
# Solo P0
pytest tests/ -v -m "p0"

# Solo integración
pytest tests/api/ -v

# Solo unitarios
pytest tests/unit/ -v
```

---

## Referencias

- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [Arquitectura AstroKid Auth](ARQUITECTURA.md)
- [OAuth y OIDC explicados](OAUTH_OIDC.md)
