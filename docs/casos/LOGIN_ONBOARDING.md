# Casos de prueba manuales: login con Firebase y onboarding de padres

> **Canónico en** `AstroKid.Tests/docs/casos/LOGIN_ONBOARDING.md` (movido desde `astro-kid-web/docs/qa/`).

Cubre el MR [!375](https://gitlab.com/marijodev/astro-kid-web/-/merge_requests/375) (web), el endpoint `POST /auth/firebase-session` y las rutas protegidas del backend, y el cierre del login solo con email en astrokid-auth ([astrokid-auth!5](https://gitlab.com/astrokid1/astrokid-auth/-/merge_requests/5)).

## Entorno

| Elemento | Valor |
| --- | --- |
| Web QA | https://astro-kid-web-qa.vercel.app |
| Backend QA | https://astro-kid-backend-1.onrender.com |
| Navegador | Chrome o Edge de escritorio, ventana de incógnito nueva por caso |
| Idioma | Español (barra de idioma arriba) |

Antes de empezar:

- El MR !375 debe estar mergeado en `qa` y desplegado en Vercel.
- En Render, `FIREBASE_PROJECT_ID` del backend QA debe ser el mismo proyecto de Firebase que usa la web QA. Si no coincide, todo login termina en error (ver LOGIN-09).
- El backend QA duerme cuando no hay tráfico. La primera petición puede tardar hasta 1 minuto; no cuenta como fallo.

## Datos de prueba

El único buzón es `soporte@astrokid.io`. **Requisito DNS/correo:** el dominio `astrokid.io` debe tener catch-all hacia ese buzón (o alias `+` equivalentes). Sin eso, `soporte+onb01@astrokid.io` y el resto de alias de esta tabla no llegan. Cada caso es una cuenta nueva que llega al mismo buzón.

La contraseña compartida de estas cuentas está en el gestor de secretos del equipo. No la copies en el repositorio, en issues ni en MRs.

| ID | Email | Contraseña | Uso |
| --- | --- | --- | --- |
| U1 | `soporte+onb01@astrokid.io` | En el gestor de secretos del equipo | Padre nuevo, email y contraseña, flujo completo |
| U2 | `soporte+onb02@astrokid.io` | En el gestor de secretos del equipo | Verificación de email (no confirmar al principio) |
| U3 | Cuenta Google sin uso previo en QA | (la de Google) | Padre nuevo con Google |
| U4 | `soporte+onb04@astrokid.io` | En el gestor de secretos del equipo | Borrador del onboarding |
| U5 | U1 después de terminar ONB-01 | En el gestor de secretos del equipo | Padre con un hijo que agrega otro |
| U6 | `soporte+onb06@astrokid.io` | En el gestor de secretos del equipo | Edades límite y validaciones |

Datos del niño (hoy es 11/10/2026 para los cálculos de edad; si la fecha cambia, recalcula):

| Dato | Valor | Edad resultante | Botón "Siguiente" |
| --- | --- | --- | --- |
| Fecha válida típica | 15/03/2018 | 8 años | Habilitado |
| Mínimo permitido | 11/10/2020 | 6 años | Habilitado |
| Menor al mínimo | 12/10/2020 | 5 años | Deshabilitado |
| Máximo permitido | 12/10/2013 | 12 años | Habilitado |
| Mayor al máximo | 11/10/2013 | 13 años | Deshabilitado |
| Adjetivos | Valiente, Curioso, Creativo (categoría Personalidad) | | |
| Intereses | Deportes → Fútbol; Arte → Dibujo | | |
| Escenas en casa | Las 2 primeras de la lista | | |
| Nombre del tutor (consentimiento) | El que muestra la pantalla (nombre de la cuenta) | | |

Límites de la pantalla de intereses: máximo 4 intereses, máximo 3 opciones dentro de cada interés y máximo 2 escenas en casa.

## Cómo revisar el estado en el navegador

En DevTools, pestaña Application, sección Local Storage del dominio de QA:

- `onboardingDraft:<email>`: el borrador del onboarding. Dura 24 horas.
- `parentEducationSeen:<email>`: indica que el padre ya vio las 3 pantallas para padres.
- `ak_pending_registration_consent`: consentimiento de registro pendiente mientras el email no está verificado.

Para repetir un caso con la misma cuenta, borra esas claves o usa una cuenta nueva.

---

## Login y verificación de email

### LOGIN-01: Registro con email y contraseña muestra el aviso de verificación

- **Prioridad:** Alta
- **Datos:** U2
- **Precondición:** El email nunca se registró en QA.

Pasos:

1. Abrir `/registro`.
2. Registrarse con el email y la contraseña de U2 y aceptar los términos.
3. Esperar a que la app redirija.
4. Revisar el buzón.

Resultado esperado:

- Se muestra la tarjeta **"Confirma tu correo"** con el texto "Te enviamos un enlace a soporte+onb02@astrokid.io…" y los botones **"Ya lo confirmé"**, **"Reenviar correo"** y **"Usar otra cuenta"**.
- No se ve el dashboard ni el onboarding.
- Llega un correo de verificación de Firebase (revisar también spam).
- En Network, `POST /auth/firebase-session` responde **403** con `detail.code = "EMAIL_NOT_VERIFIED"`.

### LOGIN-02: "Ya lo confirmé" sin haber confirmado

- **Prioridad:** Media
- **Datos:** U2, sin abrir el enlace del correo

Pasos:

1. En la tarjeta "Confirma tu correo", pulsar **"Ya lo confirmé"**.

Resultado esperado:

- Aparece el mensaje "Todavía no vemos la confirmación. Abre el enlace del correo e inténtalo de nuevo."
- La tarjeta sigue visible.

### LOGIN-03: Reenviar el correo de verificación

- **Prioridad:** Media
- **Datos:** U2

Pasos:

1. Pulsar **"Reenviar correo"**.

Resultado esperado:

- Aparece "Listo, revisa tu bandeja de entrada (y la de spam)."
- Llega un segundo correo de verificación.
- Si Firebase limita los reenvíos (muchos seguidos), aparece "No pudimos completar la acción. Inténtalo en un momento." Eso es correcto.

### LOGIN-04: Confirmar el email y continuar

- **Prioridad:** Alta
- **Datos:** U2

Pasos:

1. Abrir el enlace del correo de verificación (en otra pestaña).
2. Volver a la pestaña de AstroKid y pulsar **"Ya lo confirmé"**.

Resultado esperado:

- La tarjeta desaparece y el padre entra al onboarding (padre nuevo sin hijos).
- En Network: `POST /auth/firebase-session` responde **200** y después `POST /family-profiles/parental-consent` responde 2xx (el consentimiento de registro que quedó pendiente).
- La clave `ak_pending_registration_consent` ya no está en Local Storage.

### LOGIN-05: "Usar otra cuenta" cierra la sesión

- **Prioridad:** Baja
- **Datos:** Cualquier cuenta sin verificar (crear `soporte+onb05@astrokid.io`)

Pasos:

1. En la tarjeta "Confirma tu correo", pulsar **"Usar otra cuenta"**.

Resultado esperado:

- Se cierra la sesión y se vuelve a la pantalla pública o de login.
- Al recargar no vuelve a aparecer la tarjeta.

### LOGIN-06: Registro e inicio de sesión con Google

- **Prioridad:** Alta
- **Datos:** U3

Pasos:

1. Abrir `/login` y pulsar el botón de Google.
2. Elegir la cuenta de U3.

Resultado esperado:

- **No** aparece la tarjeta de verificación (Google ya verifica el email).
- El padre entra al onboarding completo (ver ONB-01).
- `POST /auth/firebase-session` responde **200**.

### LOGIN-07: Padre existente con email verificado

- **Prioridad:** Alta
- **Datos:** U1 después de completar ONB-01

Pasos:

1. Cerrar sesión.
2. Entrar por `/login` con el email y la contraseña de U1.

Resultado esperado:

- Entra directo al dashboard con su hijo.
- No aparece ni la tarjeta de verificación ni el onboarding.

### LOGIN-08: Padre antiguo con email sin verificar

- **Prioridad:** Alta (afecta a usuarios reales)
- **Datos:** Una cuenta de email y contraseña creada en QA **antes** de este cambio y que nunca confirmó el email.

Pasos:

1. Entrar con esa cuenta.

Resultado esperado:

- Aparece la tarjeta "Confirma tu correo" aunque la cuenta ya existía.
- Después de confirmar (como en LOGIN-04), entra a su dashboard con sus datos de siempre.

### LOGIN-09: Configuración de Firebase del backend (chequeo de entorno)

- **Prioridad:** Bloqueante si falla
- **Datos:** Cualquier cuenta verificada

Pasos:

1. Iniciar sesión y revisar en Network la respuesta de `POST /auth/firebase-session`.

Resultado esperado:

- **200** con `access_token`.
- Si responde **401** con una cuenta verificada, el `FIREBASE_PROJECT_ID` del backend QA no coincide con el proyecto de Firebase de la web. Reportarlo como problema de configuración, no del código.

---

## Onboarding de padres

### ONB-01: Padre nuevo ve el flujo completo y un solo consentimiento

- **Prioridad:** Alta
- **Datos:** U1, niño con fecha 15/03/2018, adjetivos, intereses y escenas de la tabla

Pasos:

1. Registrarse con U1 y confirmar el email (como en LOGIN-04).
2. Mientras carga, observar el header.
3. Pantalla para padres 1 de 3, "Misiones breves. Habilidades reales. Tú ves cada paso.": pulsar **"Ver cómo funciona"**.
4. Pantalla 2 de 3, "Tu hijo/a aprende a nombrar lo que siente": pulsar Siguiente.
5. Pantalla 3 de 3, "Las misiones crecen con tu hijo/a — tú sigues informado/a": pulsar Siguiente.
6. Pantalla del niño 1 (intro "Una aventura hecha para tu hijo/a"): pulsar **"Comenzar aventura personalizada"**.
7. Pantalla 2: verificar que el nombre del tutor aparece lleno y bloqueado; poner la fecha 15/03/2018; pulsar Siguiente.
8. Pantalla 3: elegir los 3 adjetivos; verificar que se genera un nombre estelar; pulsar Siguiente.
9. Pantalla 4: elegir Deportes → Fútbol y Arte → Dibujo; elegir 2 escenas; pulsar Siguiente.
10. Pantalla 5 (revelación): pulsar **"¡Despegar!"**.
11. En "Consentimiento parental": marcar las casillas, escribir el nombre del tutor y pulsar **"Dar consentimiento y continuar"**.
12. En "Confirme por correo": abrir el primer correo y confirmar; abrir el segundo correo y confirmar; volver y pulsar **"Ya confirmé el segundo correo"**.

Resultado esperado:

- En el paso 2 **no** aparece el botón "Agregar niño" en el header mientras carga, y no se abre ningún consentimiento antes de la primera pantalla.
- Se ven las 3 pantallas para padres y las 5 del niño, en orden, sin saltos. La barra de progreso del niño muestra 5 segmentos.
- El modal "Consentimiento parental" aparece **una sola vez**, al final (paso 11).
- Al terminar, el padre llega al dashboard con el niño creado (nombre estelar, edad 8).
- La clave `onboardingDraft:<email>` ya no existe en Local Storage.

### ONB-02: Padre nuevo con Google, mismo flujo

- **Prioridad:** Alta
- **Datos:** U3

Pasos:

1. Hacer LOGIN-06 y luego los pasos 3 a 12 de ONB-01.

Resultado esperado:

- Igual que ONB-01.

### ONB-03: Saltar la educación para padres

- **Prioridad:** Media
- **Datos:** Cuenta nueva `soporte+onb07@astrokid.io`

Pasos:

1. En la pantalla para padres 1 de 3, pulsar **"Ya conozco AstroKid"**.

Resultado esperado:

- Pasa directo a la intro del niño.
- Local Storage tiene `parentEducationSeen:<email>`.

### ONB-04: El borrador sobrevive a una recarga

- **Prioridad:** Alta
- **Datos:** U4

Pasos:

1. Registrar U4, confirmar el email y avanzar hasta la pantalla de adjetivos con fecha 15/03/2018 y 2 adjetivos elegidos.
2. Recargar la página (F5).

Resultado esperado:

- Mientras carga se ve "Cargando..." y no aparece un paso equivocado.
- Vuelve a la misma pantalla de adjetivos con la fecha y los 2 adjetivos guardados.

### ONB-05: El borrador sobrevive al abrir el enlace del correo en otra pestaña

- **Prioridad:** Alta
- **Datos:** U4

Pasos:

1. Seguir hasta el paso 12 de ONB-01 (esperando los correos de "Confirme por correo").
2. Abrir el enlace del correo, que abre una pestaña nueva de AstroKid.
3. En la pestaña nueva, ir a `/onboarding` si no lleva ahí.

Resultado esperado:

- La pestaña nueva retoma el onboarding con todas las respuestas, y vuelve a mostrar el diálogo de espera de los correos.
- Al pulsar "Ya confirmé el segundo correo" se crea el niño y se llega al dashboard.

### ONB-06: El borrador vence a las 24 horas

- **Prioridad:** Baja
- **Datos:** U4 con borrador guardado

Pasos:

1. En DevTools, abrir la clave `onboardingDraft:<email>` y cambiar `savedAt` a una fecha de hace más de 24 horas (por ejemplo, restar `90000000` al número).
2. Recargar.

Resultado esperado:

- El onboarding empieza de nuevo (pantallas para padres, o la intro del niño si ya las vio).
- La clave del borrador se borró.

### ONB-07: Cancelar el onboarding borra el borrador

- **Prioridad:** Media
- **Datos:** Cuenta nueva sin hijos (`soporte+onb08@astrokid.io`)

Pasos:

1. Avanzar hasta la pantalla de fecha y poner una fecha.
2. Pulsar la **X** de arriba a la derecha (o la tecla Escape).
3. En "¿Cancelar onboarding?", pulsar **"Cancelar"**.
4. Abrir `/onboarding` otra vez.

Resultado esperado:

- Sin hijos, la app vuelve al inicio.
- Al volver, el onboarding empieza limpio, sin la fecha anterior (y en la intro del niño si ya vio las pantallas para padres).

### ONB-08: Padre con un hijo agrega otro

- **Prioridad:** Alta
- **Datos:** U5

Pasos:

1. En el dashboard, pulsar **"Agregar niño"** en el header (en móvil está dentro del menú del selector de niños).
2. Completar las 5 pantallas del niño con otra fecha (por ejemplo, 11/10/2020).
3. Dar el consentimiento y confirmar los correos.

Resultado esperado:

- Al pulsar "Agregar niño" **no** se abre ningún consentimiento; va directo a `/onboarding?add=true`.
- **No** se repiten las pantallas para padres; empieza en la intro del niño.
- El consentimiento aparece una sola vez, al final.
- El dashboard muestra los 2 niños en el selector.

### ONB-09: `?add=true` sin hijos registrados

- **Prioridad:** Media
- **Datos:** Cuenta nueva sin hijos (`soporte+onb09@astrokid.io`)

Pasos:

1. Después de confirmar el email, abrir a mano `/onboarding?add=true`.

Resultado esperado:

- Se muestran las 3 pantallas para padres. Un padre sin hijos ve el flujo completo aunque la URL diga `add=true`.

### ONB-10: Padre con hijos que entra a `/onboarding` sin `add=true`

- **Prioridad:** Baja
- **Datos:** U5

Pasos:

1. Abrir `/onboarding` a mano.

Resultado esperado:

- Redirige a `/dashboard`.

### ONB-11: `/onboarding` sin sesión

- **Prioridad:** Alta
- **Datos:** Ninguno (incógnito sin sesión)

Pasos:

1. Abrir `https://astro-kid-web-qa.vercel.app/onboarding`.

Resultado esperado:

- No se ve el onboarding. Aparece la pantalla de acceso que piden las páginas privadas, o redirige al inicio.

### ONB-12: `/onboarding` con email sin verificar

- **Prioridad:** Media
- **Datos:** U2 antes de confirmar

Pasos:

1. Con la sesión de U2 sin confirmar, abrir `/onboarding`.

Resultado esperado:

- Aparece la tarjeta "Confirma tu correo", no el onboarding.

### ONB-13: Validaciones de la fecha de nacimiento

- **Prioridad:** Media
- **Datos:** U6 y las fechas límite de la tabla

Pasos:

1. En la pantalla de fecha, probar cada fecha de la tabla de datos.

Resultado esperado:

- Bajo la fecha se ve la edad calculada.
- "Siguiente" se habilita solo entre 6 y 12 años (inclusive), según la tabla.
- No se pueden elegir fechas futuras.

### ONB-14: Validaciones de adjetivos e intereses

- **Prioridad:** Media
- **Datos:** U6

Pasos:

1. En adjetivos, elegir solo 2. Luego intentar elegir el mismo adjetivo en dos casillas.
2. Elegir el tercero y pulsar el icono ✨ junto al nombre.
3. En intereses, elegir un interés sin ninguna opción dentro.
4. Intentar elegir un 5.º interés, una 4.ª opción dentro de un interés y una 3.ª escena.

Resultado esperado:

- Con 2 adjetivos, "Siguiente" está deshabilitado y no hay nombre generado. Un adjetivo ya usado aparece deshabilitado en las otras casillas.
- Con 3 adjetivos se genera un nombre, y ✨ genera otro.
- Con un interés sin opción aparece "Elige al menos una opción en cada interés seleccionado." y "Siguiente" está deshabilitado.
- No se puede pasar de 4 intereses, 3 opciones por interés ni 2 escenas (las opciones extra quedan deshabilitadas).

### ONB-15: Volver atrás en la revelación conserva los datos

- **Prioridad:** Baja
- **Datos:** Cualquier cuenta en la pantalla de revelación

Pasos:

1. En la revelación, pulsar Atrás, cambiar un interés y pulsar Siguiente.
2. Recargar la página estando en la revelación.

Resultado esperado:

- La revelación muestra los intereses nuevos.
- Tras recargar, la revelación vuelve a aparecer completa (no queda en blanco).

### ONB-16: Cancelar el consentimiento

- **Prioridad:** Media
- **Datos:** Cualquier cuenta en la revelación

Pasos:

1. Pulsar "¡Despegar!" y, en el consentimiento, pulsar **"Cancelar"**.
2. Pulsar "¡Despegar!" otra vez.

Resultado esperado:

- El modal se cierra y el padre sigue en la revelación con sus respuestas.
- El modal vuelve a abrir y se puede completar normalmente. No se creó ningún niño al cancelar.

---

## Backend QA (API)

Se prueban con `curl` o Postman contra el backend QA. **No** usar tokens falsificados contra producción.

### API-01: `/auth/firebase-session` valida el cuerpo

```bash
curl -i -X POST https://astro-kid-backend-1.onrender.com/auth/firebase-session \
  -H "Content-Type: application/json" -d '{}'
```

Resultado esperado: **422**.

### API-02: `/auth/firebase-session` rechaza un token que no es de Google

```bash
curl -i -X POST https://astro-kid-backend-1.onrender.com/auth/firebase-session \
  -H "Content-Type: application/json" \
  -d '{"id_token":"eyJhbGciOiJub25lIn0.eyJlbWFpbCI6InFhQGV4YW1wbGUuY29tIn0.firma"}'
```

Resultado esperado: **401**. No devuelve `access_token`.

### API-03: Historial de emociones sin sesión

```bash
curl -i https://astro-kid-backend-1.onrender.com/emotion-detections/cualquier-id
```

Resultado esperado: **401**.

### API-04: Tareas A2A sin sesión

```bash
curl -i -X POST https://astro-kid-backend-1.onrender.com/a2a/tasks \
  -H "Content-Type: application/json" \
  -d '{"type":"emotion_event","childId":"cualquier-id","childText":"hola"}'
```

Resultado esperado: **401**. Probar también con `"type":"mission_evaluate"` y `"type":"mission_pipeline"`.

Si responde **503** `a2a_orchestrator_disabled`, el orquestador está apagado en QA (`A2A_ORCHESTRATOR_ENABLED`). El endpoint no atiende a nadie, así que no hay exposición; marcar el caso como bloqueado por configuración.

### API-05: Un padre no puede leer el historial de un niño de otra familia

- **Datos:** Dos padres (U1 y U3) con un niño cada uno

Pasos:

1. Iniciar sesión en la web con U1 y copiar el `access_token` desde la respuesta de `/auth/firebase-session` en Network.
2. Obtener el id del niño de U3 (desde su dashboard, en Network, respuesta de los perfiles familiares).
3. Llamar:

```bash
curl -i https://astro-kid-backend-1.onrender.com/emotion-detections/<id-niño-U3> \
  -H "Authorization: Bearer <token-U1>"
```

Resultado esperado: **403** o **404**, nunca 200 con datos.

---

## App móvil de QA

El APK publicado en `astrokid-apk` apunta al backend de **producción**: con él, un niño creado en la web de QA no puede entrar. Para estas pruebas se usa el APK **AstroKid QA** (paquete `com.astrokid.mobile.qa`), que apunta a `https://astro-kid-backend-1.onrender.com`. Se instala al lado de la app de producción sin reemplazarla.

Para compilarlo (desde `apps/mobile`):

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:EXPO_SKIP_FIREBASE_PLUGINS = "1"
$env:EXPO_PUBLIC_ENV = "qa"
$env:EXPO_PUBLIC_API_URL = "https://astro-kid-backend-1.onrender.com"
npm run prebuild:android
cd android
cmd /c "gradlew.bat assembleRelease -g C:\Users\Test\.gradle"
```

El APK queda en `android/app/build/outputs/apk/release/app-release.apk`.

### MOB-01: Instalar la app de QA junto a la de producción

- **Prioridad:** Alta
- **Datos:** Teléfono Android con la app AstroKid de producción instalada (o sin ella)

Pasos:

1. Copiar el APK de QA al teléfono e instalarlo (permitir "fuentes desconocidas" si lo pide).
2. Abrir el cajón de aplicaciones.

Resultado esperado:

- Aparecen dos íconos: **AstroKid** y **AstroKid QA**. La app de producción no se reemplazó.

### MOB-02: El niño entra con el QR generado en la web de QA

- **Prioridad:** Alta
- **Datos:** U1 con su hijo creado en ONB-01

Pasos:

1. En la web de QA, entrar con U1 y abrir **"Ver Código QR"** del niño (o "Descargar QR").
2. En el teléfono, abrir **AstroKid QA** y escanear el QR (o elegir la imagen descargada desde la galería).

Resultado esperado:

- El niño entra a su panel con el nombre estelar creado en el onboarding.
- El mismo QR escaneado en la app AstroKid de **producción** no funciona (ese niño no existe en producción). Es lo esperado.

**Automatizado (Playwright + Appium):**

1. `Web.E2E`: `npx playwright test specs/01-provisioning/09-child-qr-download.spec.ts` → guarda `.cache/child-qr/latest.png`.
2. `Mobile.E2E`: `ASTROKID_USE_WEB_QR=1` (o `ASTROKID_QR_PNG`) + `npm run test:apk` usa ese PNG en la galería.

### MOB-03: Una misión con agentes funciona contra el backend nuevo

- **Prioridad:** Alta
- **Datos:** Niño de MOB-02

Pasos:

1. Abrir la misión del día y completarla, incluyendo elegir emociones o responder por voz o texto.
2. En la web de QA, con U1, revisar el progreso del niño.

Resultado esperado:

- La misión termina sin errores y el agente responde.
- El progreso aparece en el panel del padre.
- Sirve para confirmar que `/a2a/tasks` acepta la sesión del niño (si fallara, la app usaría `/mcp/child-listener` y seguiría funcionando, pero conviene reportarlo).

---

## astrokid-auth (solo local mientras el MR esté en draft)

El MR [astrokid-auth!5](https://gitlab.com/astrokid1/astrokid-auth/-/merge_requests/5) no se despliega hasta que este MR web esté en producción. Estos casos se corren en local.

### AUTH-01: Login sin contraseña bloqueado en un entorno desplegado

Pasos:

1. Arrancar astrokid-auth con `ENVIRONMENT=qa`, `AUTH_ALLOW_DEV_LOGIN=true` y un `AUTH_JWT_SECRET` de 32 caracteres o más.
2. Llamar a `POST /auth/dev-login` con `{"email":"qa@example.com"}`.
3. Abrir `GET /authorize?...` y hacer `POST /approve` con un email.

Resultado esperado: **403** en los tres, aunque el flag esté en `true`.

### AUTH-02: El servicio no arranca con el secreto de ejemplo

Pasos:

1. Arrancar con `ENVIRONMENT=qa` y el `AUTH_JWT_SECRET` de `env.example` (o uno de menos de 32 caracteres).

Resultado esperado: el servicio no arranca y el log dice "Refusing to start. AUTH_JWT_SECRET must be a unique secret of at least 32 characters…".

### AUTH-03: En local sigue funcionando

Pasos:

1. Arrancar sin `ENVIRONMENT` ni variables de Render, con `AUTH_ALLOW_DEV_LOGIN=true`.
2. Llamar a `POST /auth/dev-login`.
3. Hacer `POST /approve` con un email vacío.

Resultado esperado:

- dev-login responde **200** con token.
- `/approve` con email vacío responde **400** `invalid_request`.

---

## Licencias: Free, escuela y Premium familiar

Cuentas nuevas en QA, con el correo verificado y un hijo ya creado. Los alias llegan a `soporte@astrokid.io`. Ninguna de estas cuentas tiene código canjeado ni Premium al empezar, salvo que el caso lo diga.

| ID | Email | Uso |
| --- | --- | --- |
| L1 | `soporte+lic01@astrokid.io` | Free, hasta el tope de 10 |
| L2 | `soporte+lic02@astrokid.io` | Free que canjea licencia escolar |
| L3 | `soporte+lic03@astrokid.io` | Free que pasa a Premium familiar |
| L4 | `soporte+lic04@astrokid.io` | Free que paga Premium con Stripe |
| L5 | `soporte+lic05@astrokid.io` | Coordinador que recibe el acuerdo. No es admin |
| L6 | `soporte+lic06@astrokid.io` | Coordinador del colegio con pago exento. No es admin |
| L7 | `soporte+lic07@astrokid.io` | Coordinador del acuerdo que se archiva. No es admin |
| L8 | `soporte+lic08@astrokid.io` | Padre que el coordinador registra en la lista |
| L9 | `soporte+lic09@astrokid.io` | Segundo padre de esa misma lista |

La licencia escolar del caso LIC-02 ya está activa en QA: al menos un asiento libre y un código de invite. Anota el código en la hoja de la sesión. No lo pegues en el repositorio. LIC-05 y LIC-07 crean colegios distintos. No reutilices el código de LIC-02.

Tres roles. El mismo correo no cambia de rol al abrir otra pantalla.

1. **Admin de AstroKid** (`role=admin`) solo usa `/admin/licencias`. Escribe el nombre del colegio y el correo del coordinador, envía el acuerdo, y la licencia sigue apagada. Ese correo es el contacto del colegio: recibe el PDF y el enlace, recibe el código cuando la licencia queda activa, y es el único que abre `/escuelas`. La tarjeta del admin muestra ese contacto.
2. **Coordinador** no es admin. `/admin/licencias` le dice que no tiene `role=admin` y no lista organizaciones. El título de esa pantalla es **Admin · licencias**. Sube el acuerdo firmado y el comprobante en `/escuelas/acuerdo`. Luego entra a `/escuelas` con ese mismo correo. Ahí ve solo licencias activas: asientos canjeados, misiones de los últimos 7 días, familias con al menos una misión, el primer nombre de quien ya canjeó, la tabla de práctica CASEL y los cuatro marcos (CASEL, mentalidad de crecimiento, autodeterminación y pensar). Puede revocar la familia o a un estudiante, y los dos pasan a Free. Registra nombre, apellidos y correo del padre, uno por uno, y puede editar el mensaje. El mensaje lleva el código, los pasos de `/acceso` y la nota de que no es puntaje, diagnóstico, terapia ni resultado. No ve el correo de una familia que ya canjeó, ni fechas de nacimiento, emociones ni puntajes.
3. **Familia** entra a `/acceso` con el correo que registró el coordinador y canjea el código. La licencia escolar queda activa para esa familia. El tope pasa a 100 misiones por niño. Los hermanos de la misma cuenta usan un asiento. En el panel, la etiqueta muestra **Licencia escolar** y **100 misiones incluidas**. Es el mismo perfil: Free, escuela y Premium no crean otro. Si la escuela termina o se revoca, el perfil se queda. `/escuelas` le responde que esa vista es solo del contacto del colegio.

Al activar, con pago o con **Eximir pago**, el coordinador recibe el código y el enlace a `/escuelas`. Crear o canjear la licencia no enciende el modelo.

El tope es por niño. Free son 10 misiones. Escuela son 100. Premium no corta por cantidad. Las misiones ya jugadas se cuentan dentro del tope nuevo.

### LIC-01: Una familia Free juega hasta 10 misiones y la siguiente se bloquea

- **Prioridad:** Alta
- **Datos:** L1
- **Precondiciones:**
  - Web QA `https://astro-kid-web-qa.vercel.app` y API QA `https://astro-kid-backend-1.onrender.com`.
  - L1 tiene el correo verificado, un hijo y sesión iniciada.
  - La familia no tiene asiento escolar ni Premium.
  - El hijo tiene 0 misiones completadas.
  - Idioma de la web: español.

1. Abrir el dashboard del padre.
   - **Esperado:** La etiqueta del niño es **Free** y el detalle **10 misiones incluidas**. La barra muestra `0/10`. No aparece **Premium Familiar** ni la tarjeta del arco (`free-arc-pilot-survey`).

2. Completar misiones con el niño hasta llegar a 10 (mapa o aventura del día; las dos cuentan).
   - **Esperado:** Cada misión terminada sube la barra. En la décima queda `10/10`. Esas 10 sí se guardan.

3. Intentar iniciar una misión 11.
   - **Esperado:** La misión no arranca. La API responde **403** con `detail.code = "MISSION_QUOTA_EXCEEDED"`. El mensaje habla del plan Free y de 10 misiones por niño. En el dashboard aparece **Ya usaste las 10 misiones Free**.

4. Revisar el dashboard sin recargar la cuenta.
   - **Esperado:** Sigue **Free** y `10/10`. No hay etiqueta de licencia escolar ni de Premium. La tarjeta del arco puede mostrar que ese niño completó el arco Primer Despegue.

### LIC-02: Free pasa a licencia escolar y el tope sube a 100

- **Prioridad:** Alta
- **Datos:** L2 y el código de invite de la licencia escolar de QA
- **Precondiciones:**
  - L2 cumple las mismas condiciones iniciales que L1, y el hijo ya completó al menos 1 misión y menos de 10.
  - Anota ese número como `N`.
  - La licencia escolar está activa, con un asiento libre. El código no está agotado.
  - L2 no es el correo de contacto del colegio y no es admin.

1. Con L2, abrir `/acceso`, pegar el código y pulsar **Canjear código**.
   - **Esperado:** Aparece "Código canjeado. La licencia escolar quedó activa para esta familia." En Network, `POST /entitlements/redeem` responde **200**. Ese canje ocupa un asiento. Un segundo hijo en la misma cuenta no ocupa otro.

2. Volver al dashboard y mirar el mismo niño.
   - **Esperado:** La etiqueta es **Licencia escolar** y el detalle **100 misiones incluidas**. La barra muestra `N/100`, con las misiones de Free dentro de las 100. También se ve **Licencia escolar: hasta 100 misiones por niño**. No aparece la tarjeta del arco Primer Despegue.

3. Entrar a `/escuelas` con el correo de contacto del colegio.
   - **Esperado:** El asiento canjeado sube en uno. Se ven conteos de asientos, misiones y el primer nombre del niño. La lista de padres solo muestra direcciones que ese contacto registró. No se ve el correo de L2, salvo que el coordinador lo haya agregado en esa lista. El asiento ofrece **Revocar familia**.

4. Completar misiones hasta 100 e intentar la 101.
   - **Esperado:** La 100 queda guardada y la barra muestra `100/100`. La 101 no arranca. La API responde **403** con `MISSION_QUOTA_EXCEEDED` y el mensaje de la licencia escolar (100 por niño). Aparece **Llegaste al tope escolar (100)**.

### LIC-03: Free pasa a Premium familiar y las misiones dejan de cortarse

- **Prioridad:** Alta
- **Datos:** L3
- **Precondiciones:**
  - L3 cumple las mismas condiciones iniciales que L1. El hijo tiene al menos 1 misión y menos de 10. Anota ese número como `N`.
  - L3 no tiene asiento escolar.
  - Hay una sesión admin en `/admin/licencias` distinta de L3.

1. En `/admin/licencias`, escribir el correo de L3 y pulsar **Otorgar Premium**.
   - **Esperado:** La pantalla confirma Premium activo para esa familia. L3 no se vuelve admin. No se crea un código de colegio.

2. Con L3, abrir el dashboard.
   - **Esperado:** La etiqueta es **Premium Familiar** y el detalle **Misiones ilimitadas**. La barra muestra `N/100` mientras `N` sea menor que 100. No aparece **Ya usaste las 10 misiones Free** ni la tarjeta del arco Primer Despegue.

3. Completar misiones hasta pasar de 10, incluida una más de las que Free permitía.
   - **Esperado:** La misión extra se guarda. No hay **403** ni `MISSION_QUOTA_EXCEEDED`. La barra sigue contando dentro del tramo de 100.

4. Completar misiones hasta pasar de 100.
   - **Esperado:** La misión 101 también se guarda. La barra pasa a **∞**. Sigue sin tarjeta de tope y sin la tarjeta del arco Primer Despegue.

### LIC-04: El pago con Stripe pasa a la familia de Free a Premium

- **Prioridad:** Alta
- **Datos:** L4. Tarjeta de prueba de Stripe en modo test: `4242 4242 4242 4242`, una fecha futura, cualquier CVC de 3 dígitos y cualquier código postal.
- **Precondiciones:**
  - L4 tiene el correo verificado, un hijo, sesión iniciada y al menos 1 misión completada. Anota ese número como `N`.
  - La familia no tiene asiento escolar ni Premium. En `/acceso` se lee **Misiones: hasta 10 por niño (Free)**.
  - `GET /billing/premium/status` responde `stripe_enabled: true`. Si la pantalla dice "El pago Stripe Premium aún no está configurado", marca el caso **Bloqueado** y no uses **Otorgar Premium**.
  - Idioma de la web: español. Periodo **Mensual**.

1. Con L4, abrir `/acceso`.
   - **Esperado:** Se ve **Acceso y licencias**, **Aún sin entitlement** y el grupo **Periodo de pago** con **Mensual** seleccionado. El botón dice **Pagar {monto mensual}/mes — Premium** y tiene el nombre accesible **Pagar Premium con Stripe**.

2. Pulsar **Pagar {monto mensual}/mes — Premium** y, en la página de Stripe, cancelar el pago.
   - **Esperado:** El botón pasa a **Redirigiendo…** y `POST /billing/premium/checkout` responde **200** con `checkout_url`. Al cancelar, la web vuelve a `/acceso?premium=cancel` y muestra **Pago cancelado. Puedes actualizar cuando quieras.** Sigue **Misiones: hasta 10 por niño (Free)**. No aparece `premium_stripe`.

3. Pulsar de nuevo **Pagar {monto mensual}/mes — Premium** y pagar con la tarjeta de prueba.
   - **Esperado:** Stripe acepta el pago y devuelve a `/acceso?premium=success`. Aparece **Pago recibido. Premium desbloquea misiones ilimitadas (puede tardar unos segundos).** Tras recargar, el texto pasa a **Misiones: ilimitadas (Premium)** y las fuentes incluyen `premium_stripe`.

4. Abrir el dashboard del padre.
   - **Esperado:** La etiqueta es **Premium Familiar** y el detalle **Misiones ilimitadas**. La barra muestra `N/100`. No aparece **Ya usaste las 10 misiones Free** ni la tarjeta del arco Primer Despegue.

5. Completar una misión más de las 10 que Free permitía.
   - **Esperado:** La misión se guarda. No hay **403** ni `MISSION_QUOTA_EXCEEDED`.

### LIC-05: Enviar el acuerdo deja la licencia apagada hasta que el coordinador manda los dos archivos y el admin aprueba

- **Prioridad:** Alta
- **Datos:** L5 como correo del coordinador. Colegio `Colegio Prueba QA`. Referencia `TRX-QA-ACUERDO`. Quien firma: `Coord Prueba`, cargo `Dirección`. Dos archivos locales de menos de 5 MB: un `.txt`, un PDF y un PNG.
- **Precondiciones:**
  - Web QA `https://astro-kid-web-qa.vercel.app` y API QA `https://astro-kid-backend-1.onrender.com`. Para probar la web local contra ese API, usa `http://localhost:3000` y, si el enlace del correo abre QA, copia el token a `http://localhost:3000/escuelas/acuerdo?token=…`.
  - Sesión admin en `/admin/licencias`, distinta de L5. El admin es `soporte@astrokid.io` cuando esa cuenta tiene `role=admin`.
  - `GET /school-agreements/packet?token=prueba` responde **404** con `detail` = `Upload link not found`. Si el cuerpo es `Not Found`, marca el caso **Bloqueado**: la ruta no está desplegada.
  - El enlace del correo abre la web de QA. Si abre `astrokid.io` y esa página responde 404, marca **Bloqueado**: `PARENT_APP_URL` de QA no apunta a `https://astro-kid-web-qa.vercel.app`.
  - No existe ya un colegio activo con el nombre `Colegio Prueba QA`.
  - Idioma de la web: español.

1. Abrir `/admin/licencias`.
   - **Esperado:** Título **Activar un colegio**. Los campos vacíos muestran **Colegio**, **Correo**, **Familias · 10** y **Estudiantes · 10**. Debajo del correo: **Recibe el acuerdo para firmar. No se convierte en admin.** No está el recuadro **Validación de pago** ni el botón **Activar licencia (pago ya en mano)**.

2. Escribir `Colegio Prueba QA` y el correo L5. Dejar **Familias** y **Estudiantes** vacíos. Pulsar **Enviar acuerdo para firma y pago**.
   - **Esperado:** **Acuerdo en PDF enviado a** L5, **con el enlace para subir el firmado y el comprobante.** Después: **La licencia sigue apagada hasta que apruebes los dos archivos.** `POST /admin/schools/send-agreement` responde **200** con familias y estudiantes en **10**. No aparece un código de familias.

3. Mirar **Acuerdos enviados** para `Colegio Prueba QA`.
   - **Esperado:** La tarjeta muestra L5 y el estado **Pendiente**. El contador dice **1 de 1**. **Anterior** y **Siguiente** están deshabilitados. Si hay más de una licencia enviada, solo se ve una tarjeta y el contador indica cuál, por ejemplo **2 de 3**. El texto es **Esperando que el coordinador suba el acuerdo firmado y el comprobante en el enlace del correo. La licencia sigue apagada.** Dentro están **Eximir pago** y **Referencia de pago**. Se lee **Factura anual: 600.00 USD** y el mismo total en **CRC**, con **Tipo de cambio venta BCCR**. El tipo es el de venta del día (indicador 318) del Banco Central de Costa Rica. No hay un campo para escribir el monto. **Aprobar y activar licencia** está deshabilitado. No están **Descargar acuerdo firmado** ni **Descargar comprobante**.

4. Con la sesión admin, llamar `POST /admin/licenses/{id}/validate-packet` con acuerdo y pago en true y la referencia `TRX-QA-ACUERDO`.
   - **Esperado:** **400** con `detail.code` = `SCHOOL_PACKET_NOT_RECEIVED`. La licencia sigue en borrador y la tarjeta sigue en **Pendiente**.

5. Abrir el enlace del correo de L5, sin iniciar sesión.
   - **Esperado:** La página **Acuerdo y comprobante** muestra `Colegio Prueba QA`, **10** familias y el tope de 100 misiones. También **Factura anual: 600.00 USD** y el total en **CRC** con el tipo de cambio de venta del BCCR. El vendedor es **3-102-945956 Sociedad de Responsabilidad Limitada (nombre comercial: Glassfrog), cédula jurídica 3-102-945956**. El titular del software es **AstroKid, Inc.** No pide cuenta. El correo trae `acuerdo-astrokid.pdf` y `factura-astrokid.pdf`. No aparece "El monto es el que acordaron con AstroKid."

6. Completar nombre, cargo, correo, fecha y referencia, subir un `.txt` como acuerdo y un PNG como comprobante, y pulsar **Enviar acuerdo firmado y comprobante**.
   - **Esperado:** `POST /school-agreements/packet` responde **400** con `detail.code` = `SCHOOL_PACKET_FILE`. El formulario sigue en pantalla. La licencia sigue apagada.

7. Repetir el envío con un PDF como acuerdo y un PNG como comprobante.
   - **Esperado:** **200**. Se lee **Documentos enviados** y **Este envío no la activa.**

8. Volver a enviar los mismos dos archivos por ese enlace.
   - **Esperado:** **Esos documentos ya se enviaron.** `POST /school-agreements/packet` responde **409** con `detail.code` = `SCHOOL_PACKET_ALREADY_RECEIVED`.

9. Abrir el correo del admin.
   - **Esperado:** Asunto **AstroKid — acuerdo firmado y comprobante de Colegio Prueba QA**. Van adjuntos el acuerdo firmado y el comprobante. El cuerpo dice que el correo no activa la licencia.

10. Volver a `/admin/licencias` con el admin.
    - **Esperado:** La tarjeta está en **Completado**. Se lee **Llegaron el acuerdo firmado y el comprobante · Coord Prueba, Dirección.** Están **Descargar acuerdo firmado** y **Descargar comprobante**. **Referencia de pago** muestra `TRX-QA-ACUERDO`. **Aprobar y activar licencia** está habilitado. Sigue sin código de familias.

11. Pulsar **Descargar acuerdo firmado** y **Descargar comprobante**.
    - **Esperado:** Cada archivo se baja con extensión `.pdf`, `.png` o `.jpg` y se abre. El nombre es `acuerdo-firmado` o `comprobante`.

12. Pulsar **Aprobar y activar licencia**.
    - **Esperado:** `POST /admin/licenses/{id}/validate-packet` responde **200**. Aparece **Licencia activa para Colegio Prueba QA.** y **Código**. La pantalla dice que el correo salió a L5 con el código y el enlace para agregar padres. La tarjeta sale de **Acuerdos enviados**. Anota el código en la hoja de la sesión. No lo pegues en el repositorio. L5 no es admin. El correo de L5 tiene el asunto **AstroKid — código de acceso para Colegio Prueba QA**, el código, los asientos, el tope de 100 misiones y el enlace a `/escuelas`. Si la pantalla dice que el correo no salió, marca este paso **Bloqueado**: el envío (Resend) no está activo en QA.

### LIC-06: Una cuenta que no es admin no envía ni aprueba el acuerdo

- **Prioridad:** Alta
- **Datos:** L1
- **Precondiciones:**
  - L1 tiene sesión iniciada y no es admin.
  - El colegio de LIC-05 sigue en borrador, o ya está activo: este caso no lo modifica.

1. Con L1, abrir `/admin/licencias`.
   - **Esperado:** Se lee que la cuenta **no tiene** `role=admin`. No está **Enviar acuerdo para firma y pago**, **Archivar** ni **Aprobar y activar licencia**.

2. Con el token de L1, llamar `POST /admin/schools/send-agreement` con colegio, correo y asientos.
   - **Esperado:** **403**. No se crea otro borrador.

3. Con el mismo token, llamar `POST /admin/licenses/{id-de-LIC-05}/validate-packet` con los dos flags en true y una referencia.
   - **Esperado:** **403**. El estado de esa licencia no cambia.

4. Con el mismo token, llamar `POST /entitlements/school-parents` con el id del colegio de LIC-05 y el correo L8.
   - **Esperado:** **403**. L8 no queda en la lista de padres.

### LIC-07: Eximir pago habilita la activación sin los dos archivos

- **Prioridad:** Alta
- **Datos:** L6 como correo del coordinador. Colegio `Colegio Exento QA`.
- **Precondiciones:**
  - La misma sesión admin de LIC-05.
  - No existe ya un colegio activo con el nombre `Colegio Exento QA`.
  - Idioma de la web: español.

1. En `/admin/licencias`, escribir `Colegio Exento QA` y el correo L6. Dejar familias y estudiantes vacíos. Pulsar **Enviar acuerdo para firma y pago**.
   - **Esperado:** El mensaje nombra a L6 y dice que la licencia sigue apagada. Aparece una segunda tarjeta, distinta de `Colegio Prueba QA`, en **Pendiente**. **Aprobar y activar licencia** de esa tarjeta está deshabilitado.

2. En la tarjeta de `Colegio Exento QA`, marcar **Eximir pago**.
   - **Esperado:** **Aprobar y activar licencia** de esa tarjeta se habilita. **Referencia de pago** empieza por `EXENTO-COLEGIO-EXENTO-QA-`. El estado sigue en **Pendiente**. La otra tarjeta no cambia.

3. Pulsar **Aprobar y activar licencia** en la tarjeta exenta.
   - **Esperado:** **Licencia activa para Colegio Exento QA.** y **Correo enviado a** L6 **con el código y el enlace para agregar padres.** `POST /admin/licenses/{id}/confirm-payment` responde **200** con `payment_status` `waived`. Después `POST /admin/licenses/{id}/invites` responde **200** y trae `coordinator_email.ok` en true. La tarjeta exenta sale de **Acuerdos enviados**. Anota el código en la hoja de la sesión. No lo pegues en el repositorio. L6 no es admin. Si el texto dice que el correo al coordinador no salió, marca este paso **Bloqueado**.

### LIC-08: Archivar saca el acuerdo de la cola y lo deja en el historial

- **Prioridad:** Alta
- **Datos:** L7 como correo del coordinador. Colegio `Colegio Historial QA`.
- **Precondiciones:**
  - La misma sesión admin de LIC-05.
  - No existe ya un colegio activo con el nombre `Colegio Historial QA`.
  - Idioma de la web: español.

1. En `/admin/licencias`, escribir `Colegio Historial QA` y el correo L7. Dejar familias y estudiantes vacíos. Pulsar **Enviar acuerdo para firma y pago**.
   - **Esperado:** Aparece la tarjeta en **Acuerdos enviados**, estado **Pendiente**, contador **1 de 1**, con el botón **Archivar**. La licencia sigue apagada.

2. Pulsar **Archivar** en esa tarjeta.
   - **Esperado:** La tarjeta sale de **Acuerdos enviados**. **Historial** muestra el número de tarjetas y las oculta. Al pulsar **Historial** aparece la tarjeta, el contador dice **1 de 1**, sigue en **Pendiente** y se lee **Archivar no activa la licencia.** No hay código de familias. `POST /admin/licenses/{id}/archive` responde **200**.

3. Con la sesión de L1, llamar `POST /admin/licenses/{id}/archive`.
   - **Esperado:** **403**. La tarjeta sigue en **Historial**.

### LIC-09: El coordinador registra padres y cada uno recibe cómo activar y la práctica CASEL

- **Prioridad:** Alta
- **Datos:** L6 como coordinador de `Colegio Exento QA` (LIC-07). L8 y L9 como padres. El código anotado en LIC-07.
- **Precondiciones:**
  - LIC-07 terminó en **OK** y el correo al coordinador salió.
  - L6 puede iniciar sesión con el mismo correo del colegio. Si no tiene cuenta, la crea con ese correo antes del paso 2.
  - L8 y L9 tienen el correo verificado. Todavía no canjearon un código escolar.
  - La licencia de `Colegio Exento QA` sigue activa y le quedan al menos dos asientos.
  - Idioma de la web: español.

1. Abrir el correo de L6.
   - **Esperado:** Asunto **AstroKid — código de acceso para Colegio Exento QA**. El cuerpo trae el código de familias, los asientos, el tope de 100 misiones y el enlace a `/escuelas`. Dice que en ese perfil se agrega la lista de padres y que cada padre recibe el código.

2. Iniciar sesión con L6 y abrir `/escuelas`.
   - **Esperado:** Se ve `Colegio Exento QA`, los asientos y el código de familias. El bloque de padres pide **Nombre**, **Apellidos** y **Correo**. El texto dice que el correo explica cómo activar, qué incluye la licencia y la práctica CASEL. Bajo el escritorio se leen mentalidad de crecimiento, autodeterminación y pensar, y que no es un diagnóstico. No aparece el correo de L2. L6 no es admin. No está **Aprobar y activar licencia**.

3. En el bloque de padres, escribir el nombre y los apellidos de L8, su correo, y pulsar **Agregar padre**. Repetir con L9. Pulsar **Enviar el código a estos padres**.
   - **Esperado:** La lista pendiente muestra nombre, apellidos y correo antes de enviar. `POST /entitlements/school-parents` responde **200**. El aviso dice **2 correos nuevos enviados**. La lista muestra L8 y L9 con **Código enviado**. Al recargar `/escuelas`, las dos direcciones siguen ahí. Un correo `sin-arroba` muestra **Revisa el formato del correo.** y no entra a la lista.

4. Abrir el correo de L8.
   - **Esperado:** Asunto **AstroKid — cómo activar la licencia de Colegio Exento QA**. Tiene tres partes. **Cómo activar:** entrar a `/acceso`, iniciar sesión con ese mismo correo y canjear el código de LIC-07. **Qué incluye la licencia:** hasta 100 misiones por niño, los hermanos en la misma cuenta usan un asiento, la práctica es en la app con la supervisión del padre o la madre, la licencia no transfiere el software y no enciende por sí sola las misiones con IA. **Alineación con el aprendizaje socioemocional (CASEL):** autoconciencia, autogestión, conciencia social, habilidades relacionales y decisiones responsables. También dice que es práctica de aprendizaje, que no es un puntaje, no es un diagnóstico, no es terapia y no promete un resultado.

5. Con L8, seguir el correo: abrir `/acceso`, iniciar sesión y canjear el código.
   - **Esperado:** **Código canjeado. La licencia escolar quedó activa para esta familia.** `POST /entitlements/redeem` responde **200**. Ese canje ocupa un asiento. L9 todavía no ocupa otro.

6. Con L6, volver a enviar solo L8 desde **Lista de padres**.
   - **Esperado:** El aviso dice **0 correos nuevos enviados** y **1 ya estaban registrados**. No llega un segundo correo a L8. La lista sigue con una sola fila de L8.

7. Con la sesión de L2, llamar `POST /entitlements/school-parents` con el id de `Colegio Exento QA` y un correo nuevo.
   - **Esperado:** **403**. Ese correo no aparece en **Lista de padres**.

8. Si en el paso 3 el aviso dice que no se pudieron enviar, recargar `/escuelas`.
   - **Esperado:** L8 y L9 igual están en la lista, con **Todavía no enviado**. Marca los pasos 1 y 4 **Bloqueado** y sigue con el paso 7. Las direcciones no se borran porque el envío falló.

---

## Registro de resultados

| Caso | Resultado (OK / Falla / Bloqueado) | Navegador | Notas o enlace al bug |
| --- | --- | --- | --- |
| LOGIN-01 | | | |
| LOGIN-02 | | | |
| LOGIN-03 | | | |
| LOGIN-04 | | | |
| LOGIN-05 | | | |
| LOGIN-06 | | | |
| LOGIN-07 | | | |
| LOGIN-08 | | | |
| LOGIN-09 | | | |
| ONB-01 | | | |
| ONB-02 | | | |
| ONB-03 | | | |
| ONB-04 | | | |
| ONB-05 | | | |
| ONB-06 | | | |
| ONB-07 | | | |
| ONB-08 | | | |
| ONB-09 | | | |
| ONB-10 | | | |
| ONB-11 | | | |
| ONB-12 | | | |
| ONB-13 | | | |
| ONB-14 | | | |
| ONB-15 | | | |
| ONB-16 | | | |
| API-01 | | | |
| API-02 | | | |
| API-03 | | | |
| API-04 | | | |
| API-05 | | | |
| MOB-01 | | | |
| MOB-02 | | | |
| MOB-03 | | | |
| AUTH-01 | | | |
| AUTH-02 | | | |
| AUTH-03 | | | |
| LIC-01 | | | |
| LIC-02 | | | |
| LIC-03 | | | |
| LIC-04 | | | |
| LIC-05 | | | |
| LIC-06 | | | |
| LIC-07 | | | |
| LIC-08 | | | |
| LIC-09 | | | |
