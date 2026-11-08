# REG-PROV — Registrar usuarios (QA)

Suite Playwright: `Web.E2E/specs/provisioning/registrar-usuarios.spec.ts` (`@provisioning`).

Cada test adjunta el flujo **REG-PROV-01 / REG-PROV-02** (annotation `flow`) y los `test.step` siguen **Acción → Esperado**. Helpers: `Web.E2E/helpers/provisioningTestSteps.ts`.

## Objetivo

**Paso 1 — `asegurar cuentas`:** para cada identidad, **login primero**; si falla, **registro** en `/registro` y login. Si el login ya funciona, **no** se registra de nuevo.

Así las demás suites (`SMOKE_PARENT_*`, `SMOKE_ADMIN_*`, etc.) pueden apuntar a las mismas cuentas en `.env.local`.

| Rol | Correo | Notas |
| --- | --- | --- |
| Admin plataforma | `SMOKE_ADMIN_EMAIL` (o `REGISTRO_ADMIN_EMAIL`) | Debe estar en `ADMIN_EMAILS` del backend QA; contraseña `SMOKE_ADMIN_PASSWORD` o `REGISTRO_SUITE_PASSWORD`. |
| Coordinador escuela | `SMOKE_COORDINATOR_EMAIL` | Contacto del acuerdo en ESCUELA; el escritorio `/escuela` tras activar licencia. |
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

Prueba manual: en QA `/registro` con `astrokid.io+1@proton.me` (o el tag de tu `.env`). Si en Console aparece ese correo, los `+N` funcionan; si no, revisá red / límite de Firebase antes de culpar a Proton.

## Variables (.env.local)

| Variable | Uso |
| --- | --- |
| `REGISTRO_SUITE_PASSWORD` | Contraseña compartida (mín. 6 caracteres Firebase). **No subir a git.** |
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
| **Cuenta ya existe** | En registro debería decir «Este email ya está registrado»; usá **login** en `/login`, no otro registro. |
| **Enlaces rotos** | En Firebase Console → Authentication → **Authorized domains** debe estar `astro-kid-web-qa.vercel.app`. |

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

Casos detallados: [LOGIN_ONBOARDING.md](LOGIN_ONBOARDING.md) (LOGIN-01, LOGIN-03).

## Relación con otros casos

- Onboarding completo: [LOGIN_ONBOARDING.md](LOGIN_ONBOARDING.md)
- Coordinador + código escolar: [ESCUELA.md](ESCUELA.md)

## Registro de resultados

| Fecha | Entorno | Resultado | Notas |
| --- | --- | --- | --- |
| | QA | | |
