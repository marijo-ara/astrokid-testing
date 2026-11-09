# Render QA — enlace del coordinador para provisioning E2E

Guía para que Playwright obtenga `/escuela/acuerdo?token=…` **sin** que `send-agreement` devuelva la URL (igual que producción: el enlace va en el correo).

## Comportamiento esperado

| Paso | API | ¿Devuelve URL? |
| --- | --- | --- |
| Admin «Enviar acuerdo» | `POST /admin/schools/send-agreement` | **No** (solo organización, licencia, agreement_email) |
| Coordinador (correo real) | — | Enlace en el email |
| Solo QA / E2E | `POST /admin/licenses/{id}/qa-coordinator-upload-link` | **Sí**, si el flag está activo (sesión admin) |

La suite **02** envía el acuerdo; el E2E lee `license.id` de la respuesta y llama al endpoint QA con el JWT del admin ya logueado (`ak_access_token`).

## Render (backend QA)

Servicio: **astro-kid-backend-1** (`srv-d85r9r3tqb8s73fegu1g`).

### Dashboard (manual)

1. [Render Dashboard](https://dashboard.render.com) → servicio **astro-kid-backend-1** (QA).
2. **Environment** → **Add** → clave `SCHOOL_AGREEMENT_QA_COORDINATOR_LINK`, valor `1`.
3. **Save Changes** → esperar redeploy **Live** (unos minutos).

**Deploy del código:** `astro-kid-backend-1` suele seguir la rama **`qa`** de GitLab (no solo `main`). Si el test devuelve **404** en `qa-coordinator-upload-link`, el API QA aún no tiene el endpoint: mergeá `main` → `qa` (MR en GitLab) y esperá el deploy.

**No** hace falta `SCHOOL_AGREEMENT_EXPOSE_UPLOAD_URL` en `send-agreement` (opcional legacy).

**No** uses `SCHOOL_AGREEMENT_QA_COORDINATOR_LINK=1` en producción.

## Orden de provisioning

1. `02-activar-licencia-escolar` → flujo completo (8 pruebas): enviar acuerdo, coordinador sube PDF, activar, familia en `/access`, etc.

`npm run test:provisioning` usa un worker (`PLAYWRIGHT_WORKERS=1`). La suite **Activar Licencia Escolar** debe correr entera en serie.

## Depuración manual

Si el endpoint QA no está desplegado, podés pegar el enlace del correo en `.env.local` (solo debug):

```env
REGISTRO_SCHOOL_PACKET_URL=https://astro-kid-web-qa.vercel.app/escuela/acuerdo?token=…
```

## Nota sobre el token

El endpoint QA **rota** el token del paquete (nuevo enlace válido para E2E). El enlace del primer correo puede dejar de servir; en QA automatizado se usa el enlace capturado por el test.
