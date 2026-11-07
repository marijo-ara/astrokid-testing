# Reset de base de datos (solo QA)

> **Canónico en** `AstroKid.Tests/docs/qa/RESET_DATABASE.md`. El script sigue en `astro-kid-backend/scripts/qa/`.

Herramienta **manual** para vaciar datos de prueba entre rondas de QA. No hay endpoint HTTP.

## Compuertas Postgres (todas obligatorias)

| Variable | Dónde |
|----------|--------|
| `ENVIRONMENT=qa` | Servicio Render `astro-kid-backend-1` |
| `QA_DATABASE_RESET_ENABLED=true` | **Solo** en ese servicio QA |
| `QA_DATABASE_RESET_CONFIRM_HOST` | Subcadena del hostname de Postgres QA (evita borrar otra BD si la URL está mal) |

## Compuertas Firebase (borrar logins QA)

Para vaciar **Firebase Authentication** del proyecto QA (mismo `FIREBASE_PROJECT_ID` que usa la web QA):

| Variable | Valor |
|----------|--------|
| `QA_FIREBASE_PURGE_ENABLED=true` | Solo en `astro-kid-backend-1` |
| `QA_FIREBASE_PURGE_CONFIRM_PROJECT` | **Idéntico** a `FIREBASE_PROJECT_ID` (evita borrar otro proyecto) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Ya requerido para login; mismo credential |

Sin esas tres de Firebase, el reset solo borra Postgres + JSON en disco.

**Producción (`astro-kid-backend`):** no definir ninguna variable `QA_*`. La protección es por entorno; el script vive en la misma imagen Docker que prod — solo corre si las compuertas QA están abiertas.

## Uso

Dry-run (cuenta filas y archivos, no borra):

```powershell
cd astro-kid-backend
.\scripts\qa\reset-database.ps1
```

Borrar todo (Postgres + JSON en `/tmp/astrokid_data` o `data/`, y Firebase si está habilitado):

```powershell
.\scripts\qa\reset-database.ps1 -Apply
```

Equivalente:

```bash
python scripts/qa/reset_database.py --apply --confirm reset-qa-database
```

En **Render Shell** del servicio QA (variables del servicio ya cargadas):

```bash
python scripts/qa/reset_database.py
python scripts/qa/reset_database.py --apply --confirm reset-qa-database
```

## Local / tests

Solo SQLite en memoria o archivo local, con:

```env
ENVIRONMENT=qa
QA_DATABASE_RESET_ENABLED=true
QA_DATABASE_RESET_ALLOW_SQLITE=true
```

No uses `QA_DATABASE_RESET_ALLOW_SQLITE` en Render.

## Qué borra

- Todas las tablas ORM (familias, misiones, colegios, wallets SQL, colegios B2B, etc.)
- **Todo** JSON bajo el root de runtime (`/tmp/astrokid_data` en Render): wallets, perfiles padre, progreso, DPE, MCP, AstroWorld, etc.
- En local, bajo `data/` excepto catálogos versionados (`free_arc_catalog.json`, `dpe_theme_catalog.json`)
- Firebase Auth: todos los usuarios del proyecto QA, si `QA_FIREBASE_PURGE_*` está configurado

No rota secretos (`TOKEN_SECRET`, Stripe, etc.).

## Fuera de este script

| Dato | Acción manual |
|------|----------------|
| **Web QA (Vercel)** | Borrar site data / localStorage del navegador, o perfil limpio en DevTools |
| **astrokid-auth (App Engine)** | Códigos OAuth en memoria; reinicio del servicio los vacía |
| **Correos / Stripe test** | Histórico en proveedores; no reversible desde AstroKid |

## Deploy y verificación

1. Merge a `qa` y esperar deploy de `astro-kid-backend-1`.
2. En Render → `astro-kid-backend-1` → Environment: compuertas Postgres + Firebase (si aplica).
3. Shell: dry-run → `--apply --confirm reset-qa-database`.
4. Dry-run otra vez: filas ≈ 0, JSON ≈ 0, Firebase ≈ 0.
5. Smoke: `GET https://astro-kid-backend-1.onrender.com/child-tokens/health` y un login nuevo en web QA.
