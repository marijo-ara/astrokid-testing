# Escenarios E2E: Facturación Electrónica Hacienda

> **Canónico en** `AstroKid.Tests/docs/casos/HACIENDA_FACTURACION.md` (movido desde `astro-kid-backend/docs/E2E_HACIENDA_SCENARIOS.md`).

Escenarios end-to-end de caja negra. Spec producto Hacienda: `astro-kid-backend/docs/HACIENDA_INVOICING.md`.

## Prerrequisitos

- Backend desplegado en ambiente de QA con:
  - `FAMILY_BILLING_ENABLED=true`
  - `HACIENDA_INVOICING_ENABLED=true`
  - `HACIENDA_ENV=stag` (sandbox)
  - Credenciales de Hacienda sandbox configuradas
  - Certificado .p12 de sandbox configurado
- Cuenta de ONVO en modo sandbox
- Acceso al portal de Hacienda sandbox para verificar facturas
- Base de datos de QA accesible para verificaciones

## Escenarios Críticos

### E2E-H01: Tiquete Electrónico (TE) - Suscripción mensual

**Objetivo:** Verificar que se genera un Tiquete Electrónico para suscripción Premium mensual.

**Precondiciones:**
- Usuario nuevo sin Premium
- Sistema configurado para emitir siempre TE (decisión confirmada)

**Pasos:**
1. Usuario inicia checkout de Premium mensual (USD 9.99)
2. Completa pago en ONVO con tarjeta de prueba
3. Webhook `subscription.renewal.succeeded` llega al backend
4. Backend activa Premium para la familia
5. Backend genera tiquete electrónico
6. Hacienda acepta el tiquete
7. Backend envía email al padre con tiquete

**Verificaciones:**
- [ ] Familia tiene entitlement `premium_onvo` activo
- [ ] Se creó registro en `hacienda_invoices` con:
  - `invoice_type = 'TE'` (SIEMPRE TE para familias)
  - `status = 'accepted'`
  - `clave` de 50 caracteres
  - `consecutivo` de 20 caracteres (termina en `04` para TE)
  - `total_amount_cents = 999`
  - `currency = 'USD'`
- [ ] XML firmado está almacenado
- [ ] Tiquete aparece en portal de Hacienda sandbox con estado "Aceptado"
- [ ] Datos del emisor son correctos (Glassfrog SRL, cédula 3-102-945956, tel +506 7294-2268)
- [ ] Código de actividad: `620900` (confirmado correcto)
- [ ] Medio de pago: `05` (recaudado por terceros, confirmado correcto)
- [ ] IVA calculado correctamente: subtotal USD 8.84 + IVA USD 1.15 = total USD 9.99
- [ ] Email recibido por el padre con:
  - [ ] Asunto: "AstroKid Premium — Tiquete Electrónico"
  - [ ] PDF del tiquete adjunto
  - [ ] XML firmado adjunto
  - [ ] Consecutivo y clave visibles
  - [ ] Total USD 9.99
- [ ] Base de datos: `emailed_at` y `email_to` registrados

**Tiempo estimado:** 3-5 minutos

---

### E2E-H02: Tiquete Electrónico (TE) - Suscripción anual

**Objetivo:** Verificar que se genera un Tiquete Electrónico para suscripción Premium anual.

**Precondiciones:**
- Usuario nuevo sin Premium

**Pasos:**
1. Usuario inicia checkout de Premium anual (USD 89.99)
2. Completa pago en ONVO
3. Webhook llega y activa Premium
4. Backend genera tiquete electrónico
5. Hacienda acepta
6. Backend envía email

**Verificaciones:**
- [ ] Familia tiene entitlement `premium_onvo` activo con `billing_interval = 'year'`
- [ ] Se creó registro en `hacienda_invoices` con:
  - `invoice_type = 'TE'`
  - `status = 'accepted'`
  - `total_amount_cents = 8999`
- [ ] Tiquete aparece en portal de Hacienda sandbox
- [ ] IVA calculado correctamente: subtotal USD 79.64 + IVA USD 10.35 = total USD 89.99
- [ ] Email recibido con PDF y XML adjuntos

**Tiempo estimado:** 3-5 minutos

---

### E2E-H03: Renovación mensual - Factura automática

**Objetivo:** Verificar que las renovaciones automáticas generan facturas.

**Precondiciones:**
- Familia con Premium mensual activo
- Primera factura ya generada
- Suscripción ONVO configurada para renovar

**Pasos:**
1. Esperar a que ONVO procese renovación automática (o forzar con API de ONVO sandbox)
2. Webhook `subscription.renewal.succeeded` llega con `paymentIntentId` nuevo
3. Backend registra renovación

**Verificaciones:**
- [ ] Entitlement `premium_onvo` sigue activo (renovado)
- [ ] Se creó NUEVA factura en `hacienda_invoices` con:
  - `clave` diferente a la primera factura
  - `consecutivo` incrementado
  - Mismo `subscription_id` pero diferente `payment_intent_id`
- [ ] Factura en Hacienda sandbox con estado "Aceptado"
- [ ] No hay duplicados (misma `clave` no existe dos veces)

**Tiempo estimado:** Variable (depende de ciclo de renovación ONVO)

---

### E2E-H04: Fallo de facturación no bloquea Premium

**Objetivo:** Verificar que si falla la facturación, el usuario igual recibe Premium.

**Precondiciones:**
- Simular fallo de Hacienda (ej: credenciales OAuth inválidas temporalmente)

**Pasos:**
1. Configurar backend para simular fallo (ej: `HACIENDA_OAUTH_CLIENT_ID` inválido)
2. Usuario completa pago de Premium
3. Webhook activa Premium
4. Facturación falla (log de error)

**Verificaciones:**
- [ ] Familia tiene entitlement `premium_onvo` activo (Premium funciona)
- [ ] Registro en `hacienda_invoices` con `status = 'error'`
- [ ] `error_message` contiene detalles del error
- [ ] Webhook response es exitoso (no retorna 500)
- [ ] Log de error visible en Render con traceback completo

**Tiempo estimado:** 3-5 minutos

---

### E2E-H05: Consecutivos únicos y secuenciales

**Objetivo:** Verificar que los consecutivos son únicos y secuenciales.

**Precondiciones:**
- Base de datos vacía o con consecutivos conocidos

**Pasos:**
1. Generar 3 facturas consecutivas (3 pagos diferentes)
2. Verificar consecutivos en base de datos

**Verificaciones:**
- [ ] Primera factura: consecutivo termina en `0000000001`
- [ ] Segunda factura: consecutivo termina en `0000000002`
- [ ] Tercera factura: consecutivo termina en `0000000003`
- [ ] No hay gaps ni duplicados
- [ ] Claves son únicas (50 caracteres, sin repeticiones)

**Tiempo estimado:** 5-10 minutos

---

### E2E-H06: Clave única incluso con mismo monto y fecha

**Objetivo:** Verificar que facturas del mismo monto en la misma fecha tienen claves diferentes.

**Precondiciones:**
- Dos usuarios diferentes

**Pasos:**
1. Usuario A compra Premium mensual (USD 9.99)
2. Usuario B compra Premium mensual (USD 9.99) inmediatamente después
3. Ambas facturas se generan en el mismo minuto

**Verificaciones:**
- [ ] Ambas facturas tienen `clave` diferente (código de seguridad random diferente)
- [ ] Consecutivos son diferentes
- [ ] Ambas facturas aceptadas en Hacienda

**Tiempo estimado:** 3-5 minutos

---

### E2E-H07: Verificar que SIEMPRE se emite TE para familias

**Objetivo:** Confirmar que el sistema emite Tiquete Electrónico sin importar si hay cédula o no.

**Casos de prueba:**

| Escenario | Cédula en perfil | Tipo esperado |
|-----------|------------------|---------------|
| Usuario sin cédula | No | TE |
| Usuario con cédula física | `1-2345-6789` | TE (NO FE) |
| Usuario con cédula jurídica | `3-102-945956` | TE (NO FE) |

**Pasos:**
1. Para cada caso, crear usuario con o sin cédula
2. Comprar Premium
3. Verificar factura generada

**Verificaciones:**
- [ ] TODAS las facturas tienen `invoice_type = 'TE'`
- [ ] Ninguna factura FE se genera para familias
- [ ] XML es TiqueteElectronico, no FacturaElectronica
- [ ] Consecutivo termina en `04` (tipo TE), no `01` (tipo FE)

**Nota:** El código FE se mantiene en el sistema pero NO se usa para Premium familiar (decisión confirmada con contador).

**Tiempo estimado:** 10-15 minutos (3 casos)

---

### E2E-H08: Webhook idempotente - No duplicar facturas

**Objetivo:** Verificar que si el webhook llega duplicado, no se crean facturas duplicadas.

**Precondiciones:**
- Instrumentar backend para registrar webhooks recibidos

**Pasos:**
1. Usuario completa pago
2. Enviar webhook `subscription.renewal.succeeded` dos veces con mismo `paymentIntentId`
3. Backend procesa ambos

**Verificaciones:**
- [ ] Solo se creó UNA factura para ese `payment_intent_id`
- [ ] Segunda llamada detectada como duplicada (idempotente)
- [ ] No hay error 500 en segundo webhook

**Tiempo estimado:** 5-10 minutos

---

### E2E-H09: Consulta de estado de factura

**Objetivo:** Verificar que se puede consultar el estado de una factura en Hacienda.

**Precondiciones:**
- Factura ya creada y enviada a Hacienda

**Pasos:**
1. Obtener `clave` de factura desde base de datos
2. Llamar a endpoint de consulta de estado (si existe) o verificar en logs
3. Backend consulta estado en Hacienda
4. Actualiza estado en base de datos

**Verificaciones:**
- [ ] Estado consultado es `aceptado` o `rechazado` (terminal)
- [ ] Campo `hacienda_status` actualizado en base de datos
- [ ] Si aceptado: `accepted_at` tiene timestamp
- [ ] `hacienda_response` contiene JSON de respuesta completo

**Tiempo estimado:** 3-5 minutos

---

### E2E-H10: XML cumple esquema XSD de Hacienda v4.4

**Objetivo:** Verificar que el XML generado es válido según esquema de Hacienda.

**Precondiciones:**
- XSD de Hacienda v4.4 descargado localmente

**Pasos:**
1. Generar factura (cualquier tipo)
2. Extraer `xml_content` de base de datos
3. Validar XML contra XSD de Hacienda v4.4

**Verificaciones:**
- [ ] XML válido según XSD (sin errores de schema)
- [ ] Todos los campos requeridos presentes
- [ ] Namespaces correctos
- [ ] Estructura anidada correcta (Emisor, Receptor, DetalleServicio, etc.)

**Tiempo estimado:** 5-10 minutos (requiere setup de validador XSD)

---

## Escenarios Adicionales (Opcional)

### E2E-H11: Manejo de certificado .p12 inválido

**Objetivo:** Verificar comportamiento cuando el certificado está corrupto o la contraseña es incorrecta.

**Pasos:**
1. Configurar `HACIENDA_P12_PASSWORD` incorrecta
2. Intentar generar factura

**Verificaciones:**
- [ ] Factura tiene `status = 'error'`
- [ ] `error_message` indica problema con certificado
- [ ] Premium igual se activa

---

### E2E-H12: Factura con moneda diferente (si aplica)

**Objetivo:** Verificar que el sistema solo permite USD (o la moneda configurada).

**Pasos:**
1. Configurar pago en moneda diferente (si ONVO lo permite)
2. Verificar factura

**Verificaciones:**
- [ ] Sistema rechaza o convierte a USD
- [ ] Factura en Hacienda solo en USD (o CRC si está implementado)

---

### E2E-H13: Reembolso y Nota de Crédito (TODO)

**Objetivo:** Verificar que reembolsos generan notas de crédito.

**Estado:** Pendiente de implementación (`register_refund_retracto` es placeholder).

---

## Checklist de Ejecución

Antes de cada ciclo de testing E2E:

- [ ] Ambiente de QA limpio y estable
- [ ] Base de datos de QA respaldada
- [ ] Variables de entorno verificadas
- [ ] Certificado .p12 de sandbox válido y no vencido
- [ ] Credenciales OAuth de sandbox válidas
- [ ] ONVO sandbox funcionando
- [ ] Acceso al portal de Hacienda sandbox
- [ ] Logs de Render accesibles

Después de cada ciclo:

- [ ] Documentar resultados de cada escenario (PASS/FAIL)
- [ ] Screenshots de facturas en portal de Hacienda
- [ ] Exportar registros de `hacienda_invoices` para auditoría
- [ ] Limpiar datos de prueba (opcional según política)

---

## Matriz de Cobertura

| Escenario | Tipo Factura | Cédula | Monto | Idempotencia | Estado Hacienda |
|-----------|--------------|--------|-------|--------------|-----------------|
| E2E-H01 | FE | Sí | Mensual | - | Aceptado |
| E2E-H02 | TE | No | Anual | - | Aceptado |
| E2E-H03 | FE/TE | Sí/No | Mensual | Sí | Aceptado |
| E2E-H04 | - | - | - | - | Error |
| E2E-H05 | FE | Sí | Varios | - | - |
| E2E-H06 | FE | Sí | Mismo | - | Aceptado |
| E2E-H07 | FE | Varios tipos | - | - | - |
| E2E-H08 | FE | Sí | Mensual | Sí | - |
| E2E-H09 | FE | Sí | - | - | Consulta |
| E2E-H10 | FE/TE | Sí/No | - | - | Validación XSD |

## Notas

- **Tiempo total estimado:** 45-60 minutos para escenarios críticos (E2E-H01 a H10)
- **Frecuencia recomendada:** Antes de cada deploy a producción
- **Responsable:** QA Engineer + DevOps
- **Documentar:** Resultados en spreadsheet o issue tracker

## Referencias

- Documentación principal: `docs/HACIENDA_INVOICING.md`
- Portal Hacienda sandbox: https://www.hacienda.go.cr/ate/ (verificar URL exacto con OVi)
- ONVO sandbox: https://sandbox.onvopay.com/
