# Guía de implementación: tests de API, E2E, seguridad y priorización

> **Canónico en** `AstroKid.Tests/docs/auth/IMPLEMENTACION_TESTS.md` (movido desde `astrokid-auth/docs/`).
>
> La sección E2E con Playwright en Python quedó obsoleta: el flujo caja negra vive en
> `UI.Tests/AuthOAuthFlowTests.cs`. Unit e integración en proceso siguen en `astrokid-auth/tests/` con pytest.

Cómo implementar los tests de API (integración), los flujos E2E, los de seguridad/configuración (secciones 4 y 5 del plan) con **pytest**, **FastAPI TestClient** y, para caja negra, **Playwright C#** en este repo.

---

## 1. Estructura de directorios y dependencias

### Estructura sugerida

```
astrokid-auth/
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # Fixtures compartidos (client, config, tokens)
│   ├── unit/
│   │   ├── test_token.py
│   │   └── test_oauth_store.py
│   ├── api/                 # Tests de API (integración)
│   │   ├── __init__.py
│   │   ├── test_oidc.py      # I1–I4 Discovery, JWKS
│   │   ├── test_authorize.py # I5–I9
│   │   ├── test_approve.py   # I10–I12
│   │   ├── test_token_api.py# I13–I22
│   │   ├── test_userinfo.py # I23–I26
│   │   └── test_dev_login.py# I27–I30
│   ├── e2e/                 # Flujos E2E
│   │   ├── __init__.py
│   │   └── test_flows.py    # E1, E2, E4 (E3 opcional con backend real)
│   └── security/            # S1–S5 (opcional, algunos en api/)
│       ├── __init__.py
│       └── test_security.py
```

### Dependencias

En `requirements.txt` (o `requirements-dev.txt`):

```
pytest>=7.0.0
httpx>=0.25.0
pytest-asyncio>=0.21.0   # solo si usas tests async
# Para E2E con navegador (opcional):
# playwright>=1.40.0
```

`TestClient` de FastAPI usa `httpx` por debajo; no hace falta instanciar httpx a mano si usas `TestClient(app)`.

---

## 2. Fixtures compartidos (`tests/conftest.py`)

Centralizar aquí el cliente HTTP y datos que repiten (redirect_uri permitida, client_id, etc.).

```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import get_settings


@pytest.fixture
def client():
    """Cliente HTTP contra la app FastAPI (sin levantar servidor)."""
    return TestClient(app)


@pytest.fixture
def allowed_redirect_uri():
    """Una redirect_uri que está en AUTH_ALLOWED_REDIRECT_URIS."""
    return get_settings().get_allowed_redirect_uris()[0]


@pytest.fixture
def client_id():
    return "astro-kid-web"


@pytest.fixture
def valid_token_pair(client):
    """Par access_token + refresh_token vía dev-login (para tests que necesitan tokens)."""
    r = client.post(
        "/auth/dev-login",
        json={"email": "test@example.com", "name": "Test User"},
    )
    assert r.status_code == 200
    data = r.json()
    return data["access_token"], data["refresh_token"]


@pytest.fixture
def access_token(valid_token_pair):
    return valid_token_pair[0]


@pytest.fixture
def refresh_token(valid_token_pair):
    return valid_token_pair[1]
```

Para tests que requieren **configuración distinta** (ej. I29, S4): usar `monkeypatch` o `patch` sobre `get_settings()` / variables de entorno **antes** de importar o instanciar la app, o usar un `TestClient` creado con una app que inyecte settings (más avanzado). Alternativa sencilla: `monkeypatch.setenv("AUTH_ALLOW_DEV_LOGIN", "false")` y limpiar caché de `get_settings()` (por ejemplo con `get_settings.cache_clear()` si usas `lru_cache`).

---

## 3. Tests de API (integración) – sección 2 del plan

Herramienta: **pytest** + **TestClient**. Cada test hace una o varias peticiones HTTP y comprueba status y cuerpo.

### 3.1 OIDC Discovery y JWKS (I1–I4)

**Archivo:** `tests/api/test_oidc.py`

- **I1**: `GET /.well-known/openid-configuration` → `assert response.status_code == 200`, comprobar que el JSON tiene `issuer`, `authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`, `jwks_uri`.
- **I2**: Mismo request; `assert data["issuer"] == get_settings().issuer_url.rstrip("/")`.
- **I3**: `GET /.well-known/jwks.json` → 200; `assert "keys" in data` y cada elemento tiene `kty`, `alg`, `use`, `kid`.
- **I4**: Del discovery, `assert "openid" in data["scopes_supported"]` y lo mismo para `"profile"` y `"email"`.

Patrón:

```python
def test_i1_discovery_returns_required_fields(client):
    r = client.get("/.well-known/openid-configuration")
    assert r.status_code == 200
    data = r.json()
    for key in ("issuer", "authorization_endpoint", "token_endpoint", "userinfo_endpoint", "jwks_uri"):
        assert key in data
```

### 3.2 `/authorize` (I5–I9)

**Archivo:** `tests/api/test_authorize.py`

- **I5**: `GET /authorize?response_type=code&client_id=X&redirect_uri=<allowed>` → 200; comprobar que la respuesta es HTML y contiene inputs para `email`, `name` y hidden para `response_type`, `client_id`, `redirect_uri` (por ejemplo con `assert "name=\"email\"" in r.text` y `"name=\"redirect_uri\"" in r.text`).
- **I6**: `redirect_uri=http://evil.com/callback` → respuesta con error (en el código actual puede ser 200 + JSON `error: invalid_redirect_uri`; asertar status y/o cuerpo según implementación).
- **I7**: Omitir `response_type` o `redirect_uri` → `assert r.status_code == 422`.
- **I8**: Incluir `state=xyz123` → HTML con input hidden `state` y valor `xyz123`.
- **I9**: Añadir `code_challenge=abc&code_challenge_method=S256` → 200 (sin fallo).

Usar `client.get("/authorize", params={...})` para construir la query.

### 3.3 `/approve` (I10–I12)

**Archivo:** `tests/api/test_approve.py`

- **I10**: `POST /approve` con form-urlencoded: `response_type=code`, `client_id`, `redirect_uri` (permitida), `scope`, `state`, `email`, `name`. Seguir redirect: `assert r.status_code == 302`, `assert "Location" in r.headers`, y que la URL contenga `code=` y opcionalmente `state=`.
- **I11**: Mismo con `redirect_uri=http://evil.com` → no 302 a esa URI (error o redirect a error).
- **I12**: `email=` vacío → 422 o 400.

Patrón para I10:

```python
def test_i10_approve_redirects_with_code(client, allowed_redirect_uri, client_id):
    r = client.post(
        "/approve",
        data={
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": allowed_redirect_uri,
            "scope": "openid profile email",
            "state": "abc",
            "email": "user@example.com",
            "name": "User",
        },
        allow_redirects=False,
    )
    assert r.status_code == 302
    location = r.headers["Location"]
    assert "code=" in location
    assert allowed_redirect_uri in location
```

### 3.4 `/token` (I13–I22)

**Archivo:** `tests/api/test_token_api.py`

- **I13**: Obtener un `code` (por ejemplo con `POST /approve` y parsear `Location`), luego `POST /token` con `grant_type=authorization_code`, `code=...`, `redirect_uri=...` → 200 y JSON con `access_token`, `refresh_token`, `token_type`, `expires_in`.
- **I14**: `grant_type=authorization_code`, `code=invalid123` → 400 y cuerpo con `error: invalid_grant`.
- **I15**: Usar el mismo `code` dos veces; primera 200, segunda 400 `invalid_grant`.
- **I16**: `grant_type=refresh_token`, `refresh_token=<válido>` (por ejemplo de fixture `refresh_token`) → 200 y nuevos tokens.
- **I17**: `refresh_token=invalid` → 400 `invalid_grant`.
- **I18**: `grant_type=client_credentials` → 400 `unsupported_grant_type`.
- **I19**: `grant_type=authorization_code` sin `code` → 400 `invalid_request`.
- **I20**: `grant_type=refresh_token` sin `refresh_token` → 400 `invalid_request`.
- **I21**: Pasar el `access_token` como `refresh_token` → 400 `invalid_grant`.
- **I22**: Tras I13, decodificar el JWT (sin verificar firma o con la misma key) y comprobar claims: `sub`, `email`, `name`, `iss`, `aud`, `exp`, `iat`.

En todos los `POST /token` usar `data={...}` (form) y no `json={...}`.

### 3.5 `/userinfo` (I23–I26)

**Archivo:** `tests/api/test_userinfo.py`

- **I23**: `GET /userinfo` con `Authorization: Bearer <access_token>` (fixture) → 200 y JSON con `sub`, `email`, `name`.
- **I24**: Sin header `Authorization` → 401.
- **I25**: `Authorization: Bearer invalid` → 401.
- **I26**: Token expirado (crear uno con tiempo en el pasado, igual que en unit test U2) → 401.

### 3.6 `/auth/dev-login` (I27–I30)

**Archivo:** `tests/api/test_dev_login.py`

- **I27**: `POST /auth/dev-login` con `{"email":"a@b.com","name":"Test"}` → 200; `access_token`, `refresh_token`, `expires_in`.
- **I28**: `{"email":"not-an-email"}` → 422.
- **I29**: Con `AUTH_ALLOW_DEV_LOGIN=false` (monkeypatch + limpiar caché de settings) → 403.
- **I30**: `{"email":"a@b.com"}` sin `name` → 200; comprobar que el token o userinfo tiene un `name` derivado del email (p. ej. parte local).

---

## 4. Flujos E2E (sección 3 del plan)

Herramienta: **pytest** + **TestClient** para E1, E2 y E4 (todo vía HTTP contra la misma app). E3 puede ser TestClient + mock del backend o un test real contra astro-kid-backend si está disponible.

### E1 – Flujo OAuth completo

1. `GET /authorize?response_type=code&client_id=X&redirect_uri=<allowed>&state=s1` → 200.
2. `POST /approve` con los mismos params + email/name → 302; extraer `code` de la URL de `Location` (parsear query string).
3. `POST /token` con `grant_type=authorization_code`, `code=<extraído>`, `redirect_uri=<allowed>` → 200; guardar `access_token` y `refresh_token`.
4. Opcional: `GET /userinfo` con `Authorization: Bearer <access_token>` → 200 y claims correctos; o decodificar el JWT y comprobar `sub`/`email`/`name`.

Todo en un solo test o en pasos con fixtures que pasen el `code` y los tokens.

### E2 – Flujo refresh completo

1. Obtener tokens (dev-login o E1).
2. `POST /token` con `grant_type=refresh_token`, `refresh_token=<token>` → 200; comprobar que llegan nuevos `access_token` y `refresh_token` y que el access_token es válido (p. ej. llamar a `/userinfo`).

### E3 – Integración con backend

- **Opción A**: Test real: tener astro-kid-backend levantado (o en Docker) y variable de entorno con su URL; obtener token de astrokid-auth y llamar a un endpoint del backend con `Authorization: Bearer <token>` → 200.
- **Opción B**: Test con mock: usar `respx` o `httpx.MockTransport` para simular la respuesta del backend; el test solo verifica que se envía el header y que tu cliente reacciona bien.

### E4 – Discovery + UserInfo

1. `GET /.well-known/openid-configuration` → 200; guardar `userinfo_endpoint`.
2. Obtener `access_token` (dev-login).
3. `GET <userinfo_endpoint>` (o directamente `GET /userinfo`) con `Authorization: Bearer <access_token>` → 200; comprobar que el JSON tiene `sub`, `email`, `name` coherentes con el login.

---

## 5. Seguridad y configuración (sección 4)

- **S1 (CORS)**: En un test de API, hacer una petición con `Origin: http://evil.com` (por ejemplo con `client.get(..., headers={"Origin": "http://evil.com"})`). Comprobar que la respuesta no incluye `Access-Control-Allow-Origin: http://evil.com` (o que el navegador la rechazaría). Con TestClient la CORS a veces no se aplica igual que en un navegador; si hace falta, ejecutar un E2E con Playwright que haga una petición desde una página en otro origen.
- **S2**: Cubierto por I6 e I11 (redirect_uri no permitida).
- **S3 (JWT secret en producción)**: Test de “configuración”: en entorno de producción (o variable `AUTH_ENVIRONMENT=production`), comprobar que `get_settings().jwt_secret != "astro-kid-auth-secret-change-in-production"`. Puede ser un test que solo corre en CI con env de prod o que use monkeypatch para simular prod.
- **S4 (Dev login en producción)**: Mismo enfoque que I29: con `AUTH_ALLOW_DEV_LOGIN=false` (y opcionalmente `AUTH_ENVIRONMENT=production`), `POST /auth/dev-login` → 403.
- **S5 (TTL de códigos)**: Test de API: crear un código (vía `/approve`), avanzar el tiempo con `patch` sobre `app.services.oauth_store.time` (p. ej. `time.time` devuelve `created_at + 601`), luego `POST /token` con ese código → 400 `invalid_grant`. Mismo patrón que el unit test U10 pero a nivel HTTP.

---

## 6. Priorización (sección 5) – markers de pytest

Definir markers en `pytest.ini` o `pyproject.toml`:

```ini
# pytest.ini
[pytest]
markers =
    p0: Critical path (OAuth core, discovery, userinfo)
    p1: Important (unit, dev-login, approve)
    p2: E2E and security
    api: API integration tests
    e2e: End-to-end flows
    security: Security and config checks
```

En cada test:

```python
@pytest.mark.p0
@pytest.mark.api
def test_i1_discovery_returns_required_fields(client):
    ...
```

Ejecución:

```bash
pytest -m p0 -v
pytest -m api -v
pytest -m "p0 or p1" -v
pytest tests/unit/ tests/api/ -v   # sin E2E ni security
```

---

## 7. Resumen de herramientas por tipo

| Tipo              | Herramienta              | Uso principal                                      |
|-------------------|--------------------------|----------------------------------------------------|
| API (I1–I30)      | pytest + TestClient      | Requests GET/POST y aserciones sobre status/body   |
| E2E (E1, E2, E4) | pytest + TestClient      | Encadenar authorize → approve → token (y userinfo)  |
| E2E (E3)          | TestClient + backend real o mock (respx/httpx) | Llamar backend con Bearer token            |
| E2E con navegador | Playwright (opcional)   | Si quieres probar redirects en browser real        |
| Seguridad (S1–S5) | pytest + TestClient + patch/monkeypatch | CORS, redirect_uri, env, TTL              |
| Priorización      | pytest markers (`p0`, `p1`, `p2`, `api`, `e2e`, `security`) | Filtrar por prioridad o tipo              |

Con esto puedes implementar todos los tests de API, los flujos E2E y los de seguridad/configuración de forma ordenada y ejecutable con `pytest tests/ -v` (y opcionalmente `-m p0` o por directorio).
