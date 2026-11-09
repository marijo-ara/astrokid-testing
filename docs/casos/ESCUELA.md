# Escuela — casos de prueba de punta a punta (QA)

> **Canónico en** `AstroKid.Tests/docs/casos/ESCUELA.md` (antes `docs/ESCUELA_CASOS_E2E.md`).

Guion manual contra la web y el backend de QA ya desplegados. Recorre la creación
de una escuela y la relación entre el admin de AstroKid, el coordinador del colegio
y un padre. Cada paso dice qué debe ver esa persona.

La interfaz bajo prueba está en español. Las rutas son `/admin/licenses`
(`/admin/licencias` redirige ahí), `/escuela/acuerdo`, `/escuela`, `/access` y `/dashboard`.

Estos casos no están automatizados como un solo flujo que cree un colegio en QA.
`Web.E2E/specs/11-e2e/18-school-license-roles.spec.ts` cubre los tres roles con la API simulada:
el admin ve **Activar licencia escolar**, el coordinador ve la licencia activa (no el borrador),
el primer nombre, la práctica CASEL, los cuatro marcos, **Revocar familia** y el correo mal
formado, y un enlace de acuerdo sin token vigente no abre el formulario.
`Web.E2E/specs/07-smoke/10-parent-license-school.spec.ts` entra con cuentas reales y solo lee:
el admin ve **Activar licencia escolar**; un padre ve **Admin · licencias** y no abre `/escuela`.
La caja negra de API no crea escuelas. Rechaza el paquete sin referencia de pago, un enlace
de acuerdo desconocido, y que un padre suelte un asiento.

## Datos de cada corrida

| Rol | Cuenta | Dónde entra |
| --- | --- | --- |
| Admin de AstroKid | La cuenta de QA que ya tiene `role=admin` | `/admin/licenses` |
| Coordinador | `delivered+escuela-coord-<corrida>@resend.dev`, con cuenta en AstroKid y fuera de `ADMIN_EMAILS` | El enlace del correo y `/escuela` |
| Padre | `delivered+escuela-padre-<corrida>@resend.dev`. Familia ya creada, email-plus completo, un niño con nombre Vega, plan Free | `/access` y `/dashboard` |

Colegio del caso principal: **Colegio Norte QA**. Familias: **2**. Estudiantes: **2**.
Referencia de pago: `QA-REF-001`. Archivos: un PDF de acuerdo y un PDF de comprobante,
sin datos reales de pago.

El código de familias lo genera el sistema al activar. Se anota en la evidencia de
la corrida. No se guarda en git ni en un mensaje de commit. El correo, el nombre del
niño real y el código no se escriben en logs.

Corre **ESC-01** de principio a fin en una sola sesión, con los tres correos de esa
corrida. **ESC-02** usa otro colegio. **ESC-03** y **ESC-04** usan un acuerdo que no
se va a activar. **ESC-07** puede usar la familia que dejó ESC-01.

En cada paso guarda el texto que viste. Si el texto cambia, el caso falla.

## ESC-01 — Crear la escuela, activarla con los dos archivos y canjear

**Objetivo.** El admin deja la licencia apagada al enviar el acuerdo. El coordinador
sube el firmado y el comprobante. El admin aprueba, nace un solo código y se lo manda
al coordinador. El coordinador se lo manda al padre. El padre pasa de 10 a 100 misiones
y ve **Licencia escolar**. Cada correo sigue en su propio rol.

**Prioridad.** Alta.

### A. El admin envía el acuerdo

| Paso | Quién | Qué hace | Qué debe ver |
| --- | --- | --- | --- |
| 1 | Admin | Entra y abre `/admin/licenses` | Título **Activar licencia escolar**. El subtítulo muestra su correo y **El contacto del colegio no entra aquí.** |
| 2 | Admin | Lee la tarjeta **Activar un colegio** | El texto dice que el código lo reparte el coordinador y que cada niño tiene hasta 100 misiones. Bajo el correo: **Recibe el acuerdo para firmar. No se convierte en admin.** No aparece el botón de un piloto de 5 familias. |
| 3 | Admin | Deja Colegio y Correo vacíos | **Enviar acuerdo para firma y pago** sigue deshabilitado. |
| 4 | Admin | Escribe `Colegio Norte QA`, el correo del coordinador, Familias `2`, Estudiantes `2`, y pulsa **Enviar acuerdo para firma y pago** | Mensaje verde: **Acuerdo en PDF enviado a** ese correo, **con el enlace para subir el firmado y el comprobante. La licencia sigue apagada hasta que apruebes los dos archivos.** |
| 5 | Admin | Mira **Acuerdos enviados** | La tarjeta del colegio muestra **Pendiente**. El texto dice: **Esperando que el coordinador suba el acuerdo firmado y el comprobante en el enlace del correo. La licencia sigue apagada.** **Aprobar y activar licencia** está deshabilitado. No hay código de familias en pantalla. |
| 6 | Coordinador | Abre el correo | Llega el PDF del acuerdo y un enlace a `/escuela/acuerdo?token=…`. |

### B. El coordinador no es admin, y sube los dos archivos

| Paso | Quién | Qué hace | Qué debe ver |
| --- | --- | --- | --- |
| 7 | Coordinador | Entra con su correo y abre `/admin/licenses` | Ve que su cuenta no tiene `role=admin`, ve su correo y **Cerrar sesión**. No ve **Activar un colegio** ni **Archivar**. |
| 8 | Coordinador | Abre `/escuela` | Título **Guía de alineación de la escuela**. No aparece la tarjeta de **Colegio Norte QA**: la licencia sigue en borrador. |
| 9 | Coordinador | Abre el enlace del correo | Título **Acuerdo y comprobante**. El texto nombra **Colegio Norte QA**, **2 familias** y **hasta 100 misiones**, más la línea de la factura anual. **Enviar acuerdo firmado y comprobante** está deshabilitado. |
| 10 | Coordinador | Completa nombre de quien firma, cargo, correo, fecha, referencia `QA-REF-001`, y adjunta los dos PDF. Pulsa **Enviar acuerdo firmado y comprobante** | Título **Documentos enviados**. El texto dice que AstroKid los revisa y activa la licencia desde el panel de administración, y que **este envío no la activa**. |

### C. El admin aprueba y nace el código

| Paso | Quién | Qué hace | Qué debe ver |
| --- | --- | --- | --- |
| 11 | Admin | Recarga `/admin/licenses` | La misma tarjeta pasa a **Completado**. Lee **Llegaron el acuerdo firmado y el comprobante**, con el nombre y el cargo de quien firmó. Ve **Descargar acuerdo firmado** y **Descargar comprobante**. La referencia muestra `QA-REF-001`. No aparece **Eximir pago**. **Aprobar y activar licencia** está habilitado. |
| 12 | Admin | Pulsa **Aprobar y activar licencia** | Mensaje: **Licencia activa para Colegio Norte QA. Código** seguido del código generado. |
| 13 | Admin | Lee el recuadro del código | **Código para familias:** el mismo código. El texto dice que el correo salió al coordinador **con el código y el enlace a /escuela para agregar la lista de padres**, y que las familias canjean en `/access`. **Copiar código** pasa a **Copiado**. |

### D. El coordinador registra al padre

| Paso | Quién | Qué hace | Qué debe ver |
| --- | --- | --- | --- |
| 14 | Coordinador | Abre `/escuela` | Ve **Colegio Norte QA**. El uso dice **0 de 2 asientos canjeados**. Ve **Código para familias:** el mismo código, `0/2`. La lista dice **Todavía no hay correos de padres.** Las familias dicen **Todavía ninguna familia canjeó el código.** Bajo el escritorio, **Qué incluye el arco de la licencia escolar** nombra mentalidad de crecimiento, autodeterminación y pensar, y dice que no es un diagnóstico. |
| 15 | Coordinador | Lee **Mensaje a enviar** | El texto incluye el código, **Hasta 100 misiones por niño**, los pasos de `/access`, y la práctica CASEL. También dice que es práctica de aprendizaje: no es un puntaje, no es un diagnóstico, no es terapia y no promete un resultado. |
| 16 | Coordinador | Escribe Nombre `Ana`, Apellidos `Campos`, el correo del padre, y pulsa **Agregar padre** | La lista pendiente muestra **Ana Campos ·** el correo del padre. |
| 17 | Coordinador | Pulsa **Enviar el código a estos padres** | Aviso **1 correo nuevo enviado. 0 ya estaban registrados. 0 no se pudieron enviar.** La lista queda en **Ana Campos ·** correo **· Código enviado**. |
| 18 | Padre | Abre su correo | El mensaje es el de la pantalla: cómo entrar a `/access` con ese mismo correo y canjear el código. |

### E. El padre canjea y no administra el colegio

| Paso | Quién | Qué hace | Qué debe ver |
| --- | --- | --- | --- |
| 19 | Padre | Entra y abre `/access` | Título **Acceso y licencias**. **Acceso: activo**. **Aún sin entitlement.** En la cuota: **Misiones: hasta 10 por niño (Free)**. El campo **Código de invite escolar** está vacío y **Canjear código** está deshabilitado. |
| 20 | Padre | Escribe el código en minúsculas y pulsa **Canjear código** | El campo lo pasa a mayúsculas. Mensaje: **Código canjeado. La licencia escolar quedó activa para esta familia.** La cuota pasa a **Misiones: hasta 100 por niño (licencia escolar)**. Vega figura como usadas / 100. |
| 21 | Padre | Abre **Ir al dashboard** | El plan de la familia muestra **Licencia escolar**. El atributo `data-quota-plan` es `institutional_capped`. |
| 22 | Padre | Abre **Guía del contacto de la escuela** (`/escuela`) | Ve **Esta vista es del correo de contacto del colegio. No administra la plataforma.** Ve el enlace **Ir a Acceso**. No ve asientos, ni el código, ni el correo del coordinador, ni **Agregar un padre**. |

### F. Los otros dos roles ven el canje desde su lugar

| Paso | Quién | Qué hace | Qué debe ver |
| --- | --- | --- | --- |
| 23 | Coordinador | Recarga `/escuela` | **1 de 2 asientos canjeados.** En familias: **Vega · Licencia escolar**, con **Revocar familia** y **Regenerar código de la familia**. El asiento no muestra el correo del padre, ni fecha de nacimiento, ni emoción, ni puntaje. |
| 24 | Admin | Recarga `/admin/licenses` y abre el alumnado de ese colegio | Ve **Vega** con su rango de edad, y el correo del padre enmascarado. El correo completo no está en la página. Al pulsar **Mostrar correos de esta escuela**, aparece el correo completo. |

**Cierre.** Queda una licencia activa, un código, un asiento canjeado y uno libre.
El coordinador sigue sin `role=admin`. El padre sigue sin escritorio de escuela.

## ESC-02 — Exención de pago, sin los dos archivos

**Objetivo.** Con la exención documentada, el admin activa sin esperar la carga.
El coordinador recibe el código. El padre canjea igual que en ESC-01.

**Prioridad.** Alta solo si la corrida de QA usa exención en lugar del paquete firmado.
No sustituye a ESC-01.

| Paso | Quién | Qué hace | Qué debe ver |
| --- | --- | --- | --- |
| 1 | Admin | Repite los pasos 1 a 5 de ESC-01 con **Colegio Sur QA** y otro correo de coordinador | La tarjeta queda en **Pendiente** y **Aprobar y activar licencia** sigue deshabilitado. |
| 2 | Admin | Marca **Eximir pago** | El botón se habilita. La referencia se llena sola con un valor que empieza por `EXENTO-` y el nombre del colegio. |
| 3 | Admin | Pulsa **Aprobar y activar licencia** | **Licencia activa para Colegio Sur QA. Correo enviado a** el coordinador **con el código y el enlace para agregar padres.** Aparece el código. |
| 4 | Coordinador, padre | Siguen desde el paso 14 de ESC-01 | Mismos resultados: escritorio, correo al padre, canje a 100, **Licencia escolar**, y `/escuela` negado al padre. |

## ESC-03 — Archivar no activa

**Objetivo.** Sacar un acuerdo de la cola no enciende la licencia ni crea código.

| Paso | Quién | Qué hace | Qué debe ver |
| --- | --- | --- | --- |
| 1 | Admin | Con un acuerdo en **Pendiente**, pulsa **Archivar** | Mensaje: el colegio **pasó al historial. La licencia no se activó.** La cola de enviados ya no muestra esa tarjeta. |
| 2 | Admin | Abre **Historial** | Ve la tarjeta y el texto **En el historial. Archivar no activa la licencia.** No hay código de familias. |
| 3 | Coordinador | Abre `/escuela` | Ese colegio no aparece. |

## ESC-04 — El enlace del acuerdo no está vigente

**Objetivo.** Sin un token vigente no se pueden subir archivos.

| Paso | Quién | Qué hace | Qué debe ver |
| --- | --- | --- | --- |
| 1 | Coordinador | Abre `/escuela/acuerdo` sin token, o con `token=falso` | **Este enlace no está vigente. Pide a AstroKid que reenvíe el acuerdo.** Ve **Volver al inicio**. No ve el formulario ni **Enviar acuerdo firmado y comprobante**. |

## ESC-05 — El coordinador no manda un correo mal formado

**Objetivo.** Una dirección inválida no entra a la lista ni sale por correo.

| Paso | Quién | Qué hace | Qué debe ver |
| --- | --- | --- | --- |
| 1 | Coordinador | En una licencia ya activa, escribe nombre y apellidos, correo `sin-arroba`, y pulsa **Agregar padre** | **Revisa el formato del correo.** No aparece la lista de padres por enviar. |
| 2 | Coordinador | Deja la lista vacía y pulsa **Enviar el código a estos padres** | **Agrega al menos un correo de padre.** El aviso de correo enviado no aparece. |

## ESC-06 — Un código que no existe no cambia el plan

**Objetivo.** El canje solo acepta el código de una licencia activa.

| Paso | Quién | Qué hace | Qué debe ver |
| --- | --- | --- | --- |
| 1 | Padre | En `/access`, con la cuota todavía en **hasta 10 por niño (Free)**, escribe `NOEXISTE` y pulsa **Canjear código** | Ve un error. La cuota sigue en **hasta 10 por niño (Free)**. No aparece **Código canjeado**. |
| 2 | Padre | Abre el dashboard | El plan sigue en Free. No ve **Licencia escolar**. |

## ESC-07 — El padre no abre el escritorio aunque ya canjeó

**Objetivo.** Canjear no convierte al padre en contacto del colegio. El paso 22 de
ESC-01 ya lo comprueba dentro del flujo. Este caso se corre solo, con una familia
escolar que ya existe en QA, para revisar el control sin crear otra escuela.

| Paso | Quién | Qué hace | Qué debe ver |
| --- | --- | --- | --- |
| 1 | Padre | Entra con la cuenta escolar y abre `/escuela` | **Esta vista es del correo de contacto del colegio. No administra la plataforma.** No ve asientos, códigos ni la lista de padres. |
