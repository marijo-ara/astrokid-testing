# REG-PROV — Registrar usuarios (QA)

Suites Playwright (`@provisioning`), orden en la UI por prefijo `01-provisioning/` (cada archivo corre sola salvo **Activar Licencia Escolar**, 8 pasos en serie):

| # | Rol | Archivo |
| --- | --- | --- |
| 01 | Diagnóstico Firebase | `Web.E2E/specs/01-provisioning/01-firebase-key-smoke.spec.ts` |
| 02 | Activar licencia escolar | `Web.E2E/specs/01-provisioning/02-activar-licencia-escolar.spec.ts` — **8 pruebas en serie**: admin, acuerdo, coordinador, activación, familia en `/access` (0/100), cierre en `/escuela` |
| 03 | Familia Free | `Web.E2E/specs/01-provisioning/04-familia-free.spec.ts` |
| 04 | Familia escolar | `Web.E2E/specs/01-provisioning/05-familia-escolar.spec.ts` |
| 05 | Familia Premium | `Web.E2E/specs/01-provisioning/06-familia-premium.spec.ts` |

`npm run test:provisioning` ejecuta 01–05 (suites en disco 01, 02, 04–06). Ejemplo licencia escolar:  
`npx playwright test specs/01-provisioning/02-activar-licencia-escolar.spec.ts`

Cada test adjunta el flujo **REG-PROV-01 / REG-PROV-02** (annotation `flow`) y los `test.step` siguen **Acción → Esperado**. Helpers: `Web.E2E/helpers/provisioningTestSteps.ts`.  
Actores de todas las suites (no solo provisioning): [`E2E_ACTORES_QA.md`](E2E_ACTORES_QA.md).

## Objetivo

**Paso 1 — `asegurar cuentas`:** igual que la web (`firebaseAuthErrors.ts` + banners):

| Paso | Condición en UI | Acción provisioning |
| --- | --- | --- |
| Login | `data-auth-error-kind="account-not-found"` o texto `loginAccountNotFound` (+ CTA `login-failure-register`) | Ir a `/registro` |
| Login | `invalid-credentials` / `loginInvalidCredentials` u otro | **No** registrar (revisar contraseña o verificación) |
| Registro | `data-auth-error-kind="email-in-use"` o texto `registro.emailInUse` (+ `email-in-use-actions`) | **No** crear; solo login |

Copy y kinds: `Web.E2E/config/provisioningAuthMessages.ts`. Atributo `data-auth-error-kind` en `astro-kid-web` (`login-error-message`, `registro-error-message`).

Así las demás suites (`SMOKE_PARENT_*`, `SMOKE_ADMIN_*`, etc.) pueden apuntar a las mismas cuentas en `.env.local`.

| Rol | Correo | Notas |
| --- | --- | --- |
| Admin plataforma | `SMOKE_ADMIN_EMAIL` (o `REGISTRO_ADMIN_EMAIL`) | Debe estar en `ADMIN_EMAILS` del backend QA; contraseña `SMOKE_ADMIN_PASSWORD` o `REGISTRO_SUITE_PASSWORD`. |
| Coordinador escuela | `SMOKE_COORDINATOR_EMAIL` | Contacto del acuerdo; contraseña `SMOKE_COORDINATOR_PASSWORD` o `REGISTRO_SUITE_PASSWORD`. Escritorio `/escuela` tras activar licencia. |
| Familia Free | `SMOKE_PARENT_EMAIL` | Login o registro con la contraseña de suite. |
| Familia escolar | `SMOKE_SCHOOL_EMAIL` | Onboarding + canje en `/access` si hay código (test 2). |
| Familia Premium | `SMOKE_PREMIUM_EMAIL` (o `REGISTRO_PREMIUM_EMAIL`) | Premium requiere checkout o alta manual (`premium_unlimited`) en el test 2). |

Definí **un correo por rol** en `Web.E2E/.env.local` (Gmail u otro). Si no hay `SMOKE_*_EMAIL`, el código cae a los defaults Proton en `provisioningUsers.ts`.

### Alternativa Proton (+N)

Todos los alias llegan al mismo buzón Proton (`astrokid.io@proton.me`). En Firebase Auth **cada** `astrokid.io+N@…` es un usuario distinto del base `astrokid.io@…`.

### Si en Firebase solo ves un usuario (Proton)

| Causa | Qué hacer |
| --- | --- |
| **Buscás `+1` pero el `.env` usa otros tags** | Los tests usan `SMOKE_COORDINATOR_EMAIL`, `SMOKE_SCHOOL_EMAIL`, etc. En Console filtrá por `astrokid.io+` o pegá el correo **exacto** del paso de Playwright. |
| **Convención recomendada** | Coordinador `+1`, escolar `+2`, premium `+3` (familia free = sin `+`). Si usás `+2/+3/+4`, actualizá la doc del colegio y el acuerdo admin para el mismo contacto. |
| **Registro falló (banner genérico / rate limit)** | Tras varios intentos Firebase puede devolver `too-many-requests` y **no** crear el usuario. Esperá ~30 min o creá los usuarios a mano en Console (misma contraseña que `REGISTRO_SUITE_PASSWORD`) y marcá **correo verificado**. |
| **«No pudimos contactar a Firebase» en QA** | Si **Dominios autorizados** ya incluyen `astro-kid-web-qa.vercel.app` (como en AstroKid-Preview), el siguiente sospechoso es la **API key** en Google Cloud: Credentials → clave del proyecto `astro-kid` → *Application restrictions* = HTTP referrers con `https://astro-kid-web-qa.vercel.app/*` (y dev si aplica). O restricción de red / rate limit. La suite también intenta login si el usuario ya existe. |
| **Proton “no recibe” el `+N`** | El correo de verificación llega al buzón `astrokid.io@proton.me`; el usuario en Firebase sigue listado como `astrokid.io+N@proton.me`. |
| **`API_KEY_HTTP_REFERRER_BLOCKED` en `astro-kid.firebaseapp.com`** | El correo abre `*.firebaseapp.com/__/auth/action` y la **misma** API key del navegador bloquea ese referer. **Solución recomendada (proyecto `astro-kid` QA):** Firebase → Authentication → **Templates** → **Customize action URL** → `https://astro-kid-web-qa.vercel.app/auth/action`. Reenviá el correo de verificación (los enlaces viejos siguen en firebaseapp.com). Alternativa: GCP → Credentials → clave del **snippet Web** de ese proyecto → HTTP referrers: `https://astro-kid.firebaseapp.com/*` (además de QA Vercel). Atajo manual: Console → usuario → marcar correo verificado. |

Prueba manual: en QA `/registro` con `astrokid.io+1@proton.me` (o el tag de tu `.env`). Si en Console aparece ese correo, los `+N` funcionan; si no, revisá red / límite de Firebase antes de culpar a Proton.

## Variables (.env.local)

| Variable | Uso |
| --- | --- |
| `REGISTRO_SUITE_PASSWORD` | Contraseña compartida por defecto (mín. 6 caracteres Firebase). **No subir a git.** |
| `SMOKE_COORDINATOR_PASSWORD` | Opcional: contraseña del coordinador si difiere de la suite (los tests TC02 usan `qaIdentityPassword`, no solo la suite). |
| `REGISTRO_SCHOOL_INVITE_CODE` | Código escolar para `familia_escolar` (tras activar licencia). |
| `REGISTRO_*_EMAIL` | Opcional: sobrescribe el correo por rol (`REGISTRO_FREE_EMAIL`, `REGISTRO_PREMIUM_EMAIL`, etc.). |
| `SMOKE_ADMIN_EMAIL` / `SMOKE_ADMIN_PASSWORD` | Admin QA (login/registro en paso 1; envía acuerdo en paso 2). |
| `REGISTRO_ADMIN_EMAIL` | Opcional: admin solo con `REGISTRO_SUITE_PASSWORD` si no usás `SMOKE_ADMIN_*`. |
| `REGISTRO_SCHOOL_NAME` o `SMOKE_SCHOOL_NAME` | Nombre del colegio (default: `Colegio Proton QA`). |
| `REGISTRO_SCHOOL_FAMILIES` / `REGISTRO_SCHOOL_STUDENTS` | Cupos (default `2` / `2`). |
| `REGISTRO_ESCUELA_SEND_AGREEMENT` | `0` desactiva el envío automático del acuerdo. |
| `REGISTRO_ESCUELA_REGISTER_PARENT` | `0` evita que el coordinador agregue `REGISTRO_ESCOLAR_EMAIL` en `/escuela`. |
| `REGISTRO_ESCUELA_PARENT_GIVEN` / `REGISTRO_ESCUELA_PARENT_FAMILY` | Nombre en lista del coordinador (sintéticos). |
| `PLAYWRIGHT_ENV` | `qa` |

## Flujo escuela (automatizado + manual)

1. **Admin** (si hay `SMOKE_ADMIN_*`): `/admin/licenses` → **Enviar acuerdo** al `SMOKE_COORDINATOR_EMAIL`.
2. **Manual**: coordinador sube documentos; admin **Aprobar y activar** ([ESCUELA.md](ESCUELA.md) B–C).
3. **Coordinador** (cuenta registrada): si la licencia está activa, agrega `SMOKE_SCHOOL_EMAIL` a la lista y envía código.
4. **Familia escolar**: canje en `/access` con `REGISTRO_SCHOOL_INVITE_CODE`.

### Enlace `/escuela/acuerdo?token=…` (coordinador)

Tras el admin envía el acuerdo, el coordinador debe subir el PDF firmado y el comprobante. El E2E **`subir acuerdo firmado y comprobante`** rellena el formulario con el mismo correo del coordinador, fecha, referencia `QA-REF-E2E-001` (o `REGISTRO_SCHOOL_PAYMENT_REF`) y dos PDF de prueba.

Token del enlace (uno de estos):

| Origen | Config |
| --- | --- |
| Automático (recomendado) | `send-agreement` **no** devuelve URL. Render QA: `SCHOOL_AGREEMENT_QA_COORDINATOR_LINK=1`; la **02** llama `POST /admin/licenses/{id}/qa-coordinator-upload-link` y guarda el enlace (`.cache/`). |
| Manual (solo depuración) | `REGISTRO_SCHOOL_PACKET_URL` si el backend no puede exponer la URL. |

El siguiente test (rol **Admin**): **`activar licencia escolar tras paquete del coordinador`** → **Aprobar y activar licencia** en `/admin/licenses`. Deshabilitar con `REGISTRO_ESCUELA_ADMIN_ACTIVATE=0`.

Después (coordinador + familia escolar): **`registrar familia licencia escolar en escritorio /escuela`** — agrega `SMOKE_SCHOOL_*` / `REGISTRO_ESCOLAR_EMAIL` y, por defecto, **Enviar el código a estos padres** (`REGISTRO_ESCUELA_SEND_INVITE=0` para solo listar). Deshabilitar registro con `REGISTRO_ESCUELA_REGISTER_PARENT=0`.

Cierre de suite: **`validar rol: escritorio /escuela`** (escritorio visible y familia en pendientes).

Render QA (token automático): [RENDER_QA_ESCUELA_E2E.md](RENDER_QA_ESCUELA_E2E.md).

## Reutilizar en otras suites

Fuente única: `Web.E2E/config/qaTestAccounts.ts` + `provisioningUsers.ts`.

`SMOKE_*` es opcional; si falta, se usan los correos `REGISTRO_*` y `REGISTRO_SUITE_PASSWORD`.

| Rol QA | Override smoke | Default en código (si falta env) |
| --- | --- | --- |
| Admin plataforma | `SMOKE_ADMIN_*` / `REGISTRO_ADMIN_EMAIL` | (solo env) |
| Coordinador | `SMOKE_COORDINATOR_*` | `astrokid.io+1@proton.me` |
| Familia Free | `SMOKE_PARENT_*` | `astrokid.io@proton.me` |
| Familia escolar | `SMOKE_SCHOOL_*` | `astrokid.io+2@proton.me` |
| Familia Premium | `SMOKE_PREMIUM_*` | `astrokid.io+3@proton.me` |

Los títulos de prueba E2E llevan el rol entre corchetes, p. ej. `[Familia Free] …`.

## Cómo correr

```powershell
cd Web.E2E
npm run test:provisioning
# Solo asegurar cuentas (sin escuela/planes):
npx playwright test -g "asegurar cuentas"
```

## Verificación de correo (obligatoria en QA)

En QA el **backend exige** `email_verified` en Firebase (`/auth/firebase-session` → `403 EMAIL_NOT_VERIFIED` si no). La web muestra **Confirma tu correo**; sin el enlace no hay sesión real ni `/escuela`.

Flujo normal:

1. Registro en `/registro` → Firebase envía correo (remitente tipo `noreply@...firebaseapp.com`).
2. El mensaje llega al buzón **`astrokid.io@proton.me`** también para `+1`, `+2`, `+3`.
3. Abrís el enlace → redirige a QA (`/auth/action` o `/login`).
4. **Ya lo confirmé** en la app o volvés a iniciar sesión.

### Si no llegan los correos

| Qué revisar | Acción |
| --- | --- |
| **Spam / filtros Proton** | Buscar `firebase`, `noreply`, o el destinatario `astrokid.io+1@…` en todo el buzón. |
| **Demora** | Firebase a veces tarda 5–15 min; no hagas muchos “Reenviar” seguidos. |
| **Demasiados intentos** | Tras muchos registros, Firebase responde `too-many-requests`; esperá ~15–30 min. |
| **Cuenta ya existe** | En `/registro`: «Ya hay una cuenta de AstroKid con este correo…» → solo **login** (`provisioningAuthMessages.ts`). En `/login` sin cuenta: «No hay una cuenta de AstroKid con este correo…» → registro. |
| **Enlaces rotos** | En Firebase Console → Authentication → **Authorized domains** debe estar `astro-kid-web-qa.vercel.app`. |

### Login Playwright: CORS / «No pudimos conectar» solo en automático (no manual)

Causa habitual en **este repo**: `playwright.config` mandaba `x-vercel-protection-bypass` en **todas** las peticiones (también `identitytoolkit.googleapis.com`). El preflight a Google falla por CORS; el navegador manual no lleva esos headers.

**Arreglo en código:** bypass Vercel solo al `baseURL` (`fixtures/vercelProtectionHeaders.ts`); cookie en `.auth/vercel-password.json` vía `global-setup`.

Si tras actualizar el repo sigue fallando, revisá GCP (sección siguiente).

### Login Playwright: CORS / «No pudimos conectar con el servidor» (no es Render)

Si en el **trace de Playwright** ves en consola:

`Access to fetch at 'https://identitytoolkit.googleapis.com/...' from origin 'https://astro-kid-web-qa.vercel.app' has been blocked by CORS policy`

el fallo es **antes** de cualquier llamada al backend en Render: el **navegador** no puede hablar con **Firebase Auth** (Google Identity Toolkit).

| Dónde | Qué hacer |
| --- | --- |
| **Google Cloud Console** (mismo proyecto que `NEXT_PUBLIC_FIREBASE_PROJECT_ID` en Vercel QA) → **APIs & Services** → **Credentials** → API key del browser (la de `NEXT_PUBLIC_FIREBASE_API_KEY`) | **Application restrictions** → HTTP referrers → añadir `https://astro-kid-web-qa.vercel.app/*` y `https://*.vercel.app/*`. Sin referrer que coincida, Google no devuelve CORS y la web muestra error de red. |
| Misma API key | **API restrictions**: *Don't restrict* (recomendado para diagnosticar) o incluir **Identity Toolkit API**. |
| **Firebase Console** → Authentication → **Settings** → **Authorized domains** | `astro-kid-web-qa.vercel.app` (y el dominio que uses en manual). |
| **Vercel** → proyecto QA → Environment Variables | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = `astro-kid` (preview). Si apunta a `astrokid-prod-90c93`, la key de GCP que editaste en **AstroKid-Preview** no es la del build. |
| **Misma API key** | En DevTools → Network, request `signInWithPassword`: el parámetro `key=` debe ser **la misma** credencial que editaste en GCP. Hay **varias** keys en el proyecto; es el error más común. |
| **Pestaña API restrictions** (no solo Websites) | Probar **Don't restrict key**. Si restringís APIs: **Identity Toolkit API** y **Token Service API**. Sin eso sigue el CORS aunque el referrer esté bien. |
| Diagnóstico rápido | `npm run test:provisioning:firebase-audit` → annotation `firebase-key-suffix` con sufijo de la key real del deploy. |

**Por qué manual “sí” y Playwright “no”:** suele ser que el manual fue en **otro origen** (p. ej. `astrokid.io` o `localhost`) con referrers ya permitidos, o con **sesión guardada** (no vuelve a llamar a `signInWithPassword`). En incognito en **la misma URL** `https://astro-kid-web-qa.vercel.app/login` con email/contraseña debe reproducir el mismo CORS si falta el referrer.

En la app, si ya iniciaste sesión pero el backend no tiene JWT: pantalla **Confirma tu correo** con **Reenviar correo** (no cierres la sesión antes de reenviar).

### Atajo QA (sin esperar el correo)

Para cuentas de prueba fijas (provisioning):

1. [Firebase Console](https://console.firebase.google.com) → proyecto **de QA** (el mismo que `NEXT_PUBLIC_FIREBASE_*` en Vercel preview `qa`).
2. **Authentication** → **Users** → el correo (`astrokid.io+1@proton.me`, etc.).
3. Menú del usuario → **Verificar correo** (o crear el usuario manual y marcar verificado).
4. Vuelve a correr `npm run test:provisioning` o login manual.

No uses este atajo en producción.

### Errores de la app que confunden

| Mensaje | Causa habitual |
| --- | --- |
| **Error al crear la cuenta. Inténtalo de nuevo.** | Firebase devolvió un error no mapeado (red, límite, config) o excepción en el cliente; **no** siempre significa “no se creó”. Revisá Firebase Console si el usuario existe. |
| **¡Bienvenido, Explorador!** en `/dashboard` o `/escuela` | No hay sesión Firebase (no verificado o no logueado). |
| **Confirma tu correo** | Usuario en Firebase sí existe; falta el enlace. |
| **No pudimos conectar con el servidor** (login) + consola CORS `identitytoolkit` | API key / referrers / dominio autorizado en **Google Cloud + Firebase**, no Render. Ver sección anterior. |

Casos detallados: [LOGIN_ONBOARDING.md](LOGIN_ONBOARDING.md) (LOGIN-01, LOGIN-03).

## Relación con otros casos

- Onboarding completo: [LOGIN_ONBOARDING.md](LOGIN_ONBOARDING.md)
- Coordinador + código escolar: [ESCUELA.md](ESCUELA.md)

## Registro de resultados

| Fecha | Entorno | Resultado | Notas |
| --- | --- | --- | --- |
| | QA | | |
