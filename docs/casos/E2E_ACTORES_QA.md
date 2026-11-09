# Actores QA — quién ejecuta cada prueba Web.E2E

Cuentas canónicas: `Web.E2E/config/qaTestAccounts.ts` y `provisioningUsers.ts`  
(`REGISTRO_SUITE_PASSWORD`, `SMOKE_ADMIN_*`, `SMOKE_PARENT_*`, `SMOKE_SCHOOL_*`, `SMOKE_PREMIUM_*`, `SMOKE_COORDINATOR_*`).

En reportes Playwright buscá la anotación **`qa-actor`** (helper `helpers/qaActorAnnotations.ts`).

Todos los títulos de prueba usan **`qaTitle(actor, '…')`** → aparecen como `[Admin plataforma] …`, `[Visitante (sin sesión)] …`, etc. (`config/qaTestAccounts.ts`).

Leyenda de **modo**:

| Modo | Significado |
| --- | --- |
| Sin sesión | Solo navegación pública; no hay login |
| Login Firebase | Correo/contraseña reales contra QA |
| Sesión mock | `localStorage` + token; no Firebase |
| Mock + API | Sesión mock y `page.route` sobre el backend |

---

## 01–06 Provisioning (`specs/01-provisioning/`)

| # | Suite | Actor | Modo |
| --- | --- | --- | --- |
| 01 | Firebase key | Diagnóstico (email probe falsos) | Sin sesión |
| 02 | Admin plataforma | **Admin plataforma** | Login Firebase |
| 03 | Coordinador escuela | **Coordinador** + **Admin** (activar licencia) + coordinador `/escuela` | Login Firebase |
| 04 | Familia Free | **Familia Free** | Login Firebase |
| 05 | Familia licencia escolar | **Familia escolar** (+ código escolar si aplica) | Login Firebase |
| 06 | Familia Premium | **Familia Premium** | Login Firebase |

---

## 07–10 Smoke (`specs/07-smoke/`)

| # | Suite | Actor | Modo |
| --- | --- | --- | --- |
| 07–08 | Landing / heading | Visitante | Sin sesión |
| 09 | Dashboard smoke | Mock — padre genérico (`test@example.com`, `TestHelpers.setupTestEnvironment`) | Mock + API |
| 10 | Padre, licencia y escuela | Por prueba (ver abajo) | Login Firebase |

### 10 — detalle por prueba

| Actor en título `[…]` | Qué hace |
| --- | --- |
| Familia Free | `SMOKE_PARENT_*` → panel, plan |
| Familia escolar | `SMOKE_SCHOOL_*` → licencia institucional |
| Admin plataforma | `SMOKE_ADMIN_*` → `/admin/licenses` |
| Familia Free + Admin plataforma | Entra **Familia Free**; comprueba que no ve rutas de admin/colegio |

---

## 11–18 E2E (`specs/11-e2e/`)

| # | Suite | Actor | Modo |
| --- | --- | --- | --- |
| 11 | Simple E2E | Visitante (carga `/`, `/login`, `/dashboard` sin aprovisionar) | Sin sesión |
| 12 | Dev login flow | **Familia Free** (email canónico, datos en mock) | Mock + API |
| 13 | Parent login flow | Mezcla: ver pruebas | Firebase o mock |
| 14 | Password reset | **Familia Free** (solo el correo en formularios; no inicia sesión) | Sin sesión |
| 15 | User journey | Visitante | Sin sesión |
| 16 | Multi-environment | Visitante en `/login` | Sin sesión |
| 17 | Adaptive parent/child | **Familia Free** (mock API) | Mock + API |
| 18 | School license roles | Por prueba: Admin, Coordinador y/o Familia escolar (emails canónicos en sesión mock) | Mock + API |

### 13 — detalle

| Prueba | Actor | Modo |
| --- | --- | --- |
| Con cuenta existente… | Familia Free | Login Firebase (`SMOKE_PARENT`) |
| [mock] sin perfil… | Fixture sin cuenta (`MOCK_UNPROVISIONED_PARENT_EMAIL`) | Mock |
| Entra al panel… | Familia Free | Login Firebase (omite si `mockData` en env) |

### 18 — detalle (título `[Actor]`)

Cada caso usa `seedSession` con el correo del rol y stubs de `/auth/me`, admin u organizaciones según el escenario. Los títulos `qaTitle` indican el rol **que simula la UI** (admin envía acuerdo; coordinador en `/escuela`; familia en `/access`).

---

## 19–20 Privacy (`specs/19-privacy/`)

| # | Suite | Actor | Modo |
| --- | --- | --- | --- |
| 19 | COPPA web | Visitante / enlace email-plus falso | Sin sesión |
| 20 | Premium e IA | **Familia Premium** (`PREMIUM_PARENT`, mock billing/ai-consent) | Mock + API |

---

## 21–22 Accessibility (`specs/21-accessibility/`)

| # | Suite | Actor | Modo |
| --- | --- | --- | --- |
| 21 | Accessibility | Landing y login: visitante; bloque Dashboard: mock padre genérico | Mixto |
| 22 | Acc + performance | Visitante (landing) | Sin sesión |

---

## 23–24 Performance (`specs/23-performance/`)

| # | Suite | Actor | Modo |
| --- | --- | --- | --- |
| 23–24 | Performance / CWV | Mayoría landing y login: visitante; pruebas de dashboard: mock padre genérico | Mixto |

---

## Roles QA (resumen)

| Rol | Variables típicas | Dónde se usa |
| --- | --- | --- |
| **Admin plataforma** | `SMOKE_ADMIN_*`, `REGISTRO_ADMIN_EMAIL` | Provisioning 02, smoke 10, E2E 18, crear escuela |
| **Coordinador escuela** | `SMOKE_COORDINATOR_*`, `REGISTRO_COORDINADOR_EMAIL` | Provisioning 03, E2E 18 |
| **Familia Free** | `SMOKE_PARENT_*`, `REGISTRO_FREE_EMAIL` | Provisioning 04, smoke 10, login E2E, password reset |
| **Familia escolar** | `SMOKE_SCHOOL_*`, `REGISTRO_ESCOLAR_EMAIL` | Provisioning 05, smoke 10, E2E 18 |
| **Familia Premium** | `SMOKE_PREMIUM_*`, `REGISTRO_PREMIUM_EMAIL` | Provisioning 06, privacy 20 |
| **Visitante** | — | Landing, COPPA, journeys simples |
| **Mock padre genérico** | `test@example.com` en constantes | Smoke dashboard, accesibilidad dashboard, performance dashboard |
