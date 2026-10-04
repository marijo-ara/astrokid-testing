# AstroKid — Requisitos COPPA, mapa de datos y trazabilidad

Fuente de verdad para validar COPPA desde especificación → diseño → pruebas.
Cada requisito tiene un ID (`COPPA-xx`), el control que lo implementa y las pruebas
que lo verifican en las dos capas de la pirámide:

- **Unit / componente** (en el repo de código, sin red): prueban la regla.
- **Caja negra** (este repo, contra un entorno desplegado): prueban que la regla está activa en ese entorno.

Este documento no es una certificación ni una opinión legal. Describe lo que el
producto hace y cómo se comprueba.

Versiones vigentes: política `2026-10-02`, aviso de IA `2026-10-03`.

## 1. Mapa de datos

| Dato | Dónde se guarda | Sale a terceros | Base / consentimiento |
| --- | --- | --- | --- |
| Email y nombre del padre/madre | Backend (PostgreSQL) | Resend (envío de correos); Stripe (si verifica con cargo) | Cuenta del adulto |
| Nombre estelar del niño | Backend | Nunca. Se reemplaza antes de cualquier llamada externa | Email-plus (COPPA-01) |
| Edad | Backend | Solo rango de edad a OpenAI, con permiso de IA | Email-plus + permiso de IA (COPPA-04) |
| Intereses | Backend | Solo un interés a OpenAI, con permiso de IA | Email-plus + permiso de IA |
| Adjetivos, emoción elegida, progreso, puntaje de resiliencia, racha | Backend | No | Email-plus |
| Texto libre en la misión | Clasificación de seguridad local; no se guarda completo | Sin nombre, a OpenAI, solo con permiso de IA y riesgo bajo/medio | Permiso de IA (COPPA-04, COPPA-13) |
| Voz del niño | No se procesa | No (el endpoint responde 403) | — (COPPA-10) |
| Datos de tarjeta | Solo Stripe. AstroKid guarda id de pago, monto y reembolso | Stripe | Verificación del permiso de IA (COPPA-05) |
| Medición / analítica | — | Ninguna en rutas infantiles; en páginas de adultos solo tras aceptar | Opt-in del adulto (COPPA-07, COPPA-08) |

## 2. Requisitos, controles y pruebas

| ID | Requisito | Control (diseño) | Unit / componente (repo de código) | Caja negra (este repo) |
| --- | --- | --- | --- | --- |
| COPPA-01 | Consentimiento verificable (email-plus) antes de guardar datos del niño | `require_email_plus` en `POST /family-profiles/` y `POST /family-profiles/{id}/children` | backend `test_parental_email_plus.py::test_child_profile_is_blocked_until_the_second_email`, `::test_failed_email_does_not_open_the_profile` | `API.Tests/Coppa/CoppaTests.cs::COPPA_01_*`; `Web.E2E/specs/privacy/coppa-web.spec.ts` (COPPA-01, enlace falso) |
| COPPA-02 | Dos pasos; enlaces de un solo uso, con vencimiento (72 h) y atados a la versión de la política | `parental_email_plus.consume_email_plus_token` | backend `test_parental_email_plus.py::test_a_used_link_cannot_be_opened_again` | `CoppaTests::COPPA_02_*` (3 casos) |
| COPPA-03 | Tras las dos confirmaciones el adulto puede crear el perfil, con reconocimiento explícito | `parental_consent_acknowledged` + email-plus | backend `test_parental_consent.py::test_require_child_consent_acknowledged_*` | `CoppaTests::COPPA_03_*` |
| COPPA-04 | Consentimiento separado antes de compartir con un tercero (IA). Apagado por defecto; el aviso dice qué sale, qué no, a quién, para qué, entrenamiento, retención y cómo revocar | `services/ai_consent.py` (`child_ai_allowed`, `notice`), tarjeta del panel | backend `test_ai_consent.py::test_ai_is_off_without_a_paid_consent`, `::test_notice_names_what_goes_out_to_whom_and_why` | `CoppaTests::COPPA_04_*` (apagado + aviso; auth y propiedad) |
| COPPA-05 | Ese consentimiento se verifica con un cargo de tarjeta sobre el aviso vigente; solo el webhook firmado de Stripe lo activa | Checkout `astrokid_ai_consent`, `activate_from_checkout`, firma del webhook | backend `test_ai_consent.py::test_paid_charge_turns_ai_on_and_records_the_method`, `::test_unpaid_or_old_notice_does_not_turn_ai_on`, `::test_another_parent_cannot_turn_ai_on` | `CoppaTests::COPPA_05_*` (aviso viejo → 409; webhook falso no activa) |
| COPPA-06 | El adulto puede revocar en cualquier momento; queda registro | `POST /ai-consent/children/{id}/revoke` | backend `test_ai_consent.py::test_revoke_turns_ai_off_and_is_logged` | `CoppaTests::COPPA_06_*` |
| COPPA-07 | Sin medición de terceros antes del opt-in del adulto | Zonas de analítica en `apps/web/src/lib/analytics` | Parcial: web `analyticsPrivacy.test.ts` (sin grabación de sesión, identificadores eliminados). Falta un unit del opt-in | `coppa-web.spec.ts` (COPPA-07) |
| COPPA-08 | Nunca medición de terceros en rutas infantiles | `CHILD_PREFIXES` en `routes.ts` | web `analyticsPrivacy.test.ts` | `coppa-web.spec.ts` (COPPA-08: `/adventure`, `/mapas-misiones`) |
| COPPA-09 | Minimización: sin nombre, sin edad exacta, sin emociones ni puntajes; `store=False`, sin id de usuario | `services/privacy/outbound.py`, proxy de OpenAI | backend `test_outbound_minimize.py` (7 casos) | `CoppaTests::COPPA_09_*` (insights locales sin permiso) |
| COPPA-10 | La voz del niño no sale a proveedores | `speech.voice_processors_enabled()` → 403 | backend `test_outbound_minimize.py::test_emotion_does_not_call_azure_by_default` | `CoppaTests::COPPA_10_*` |
| COPPA-11 | La política de privacidad describe estas prácticas (IA apagada, qué se envía, cargo de US$0.50, proveedores) | `legalMessages.ts` | web `privacyPolicyMessages.test.ts` | `coppa-web.spec.ts` (COPPA-11) |
| COPPA-12 | No se guardan transcripciones completas | Sanitizado en memoria, expresión y eventos de seguridad | backend `test_ai_mvp_validation.py::test_v2_safety_event_persists_without_transcript`, `::test_v5_sanitize_strips_transcripts_from_memory`, `::test_v5_audit_dict_excludes_utterance`; `test_expression_profile.py::test_sanitize_strips_transcript_and_keeps_cosmetics` | `API.Tests/Expression/ExpressionTests.cs` (transcript eliminado) |
| COPPA-13 | Clasificación de seguridad antes de cualquier LLM; riesgo alto/crítico sin LLM y con alerta al adulto | `services/safety/` | backend `test_safety_gate.py`, `test_safety_audit_channels.py` | `API.Tests/Safety/SafetyEventsTests.cs` |
| COPPA-14 | El adulto puede ver, exportar y borrar los datos del niño | Export y borrado en `family_profiles` | backend `test_child_data_export.py`, `test_family_remove_child.py` | **Pendiente** (ver §4) |
| COPPA-15 | Sin contrato de datos con el proveedor, la IA no se activa | `AI_PROVIDER_DPA_ACCEPTED` | backend `test_ai_consent.py::test_provider_contract_flag_is_required` | Indirecto: `COPPA_04` lee `available` / `unavailable_reason` |
| COPPA-16 | Datos del niño solo para su adulto; acciones sensibles solo del adulto o admin | `get_child_for_parent`, `require_child_access`, `require_admin` | backend `test_auth_and_ownership.py`, `test_wallet_api.py` | `CoppaTests::COPPA_04_Ai_Consent_Requires_Auth_And_Ownership`; `API.Tests/Wallet/WalletTests.cs` |
| COPPA-17 | Programa de seguridad escrito y política de retención escrita (regla enmendada 2025) | Proceso | — | No automatizable. Estado: **abierto** |

## 3. Cómo correr la verificación

```powershell
# Capa unit (repos de código)
cd astro-kid-backend; python -m pytest -q
cd astro-kid-web/apps/web; npx jest privacyPolicyMessages analyticsPrivacy

# Capa caja negra (este repo)
$env:ASTROKID_BASE_URL = "https://<backend-qa>"
dotnet test API.Tests --filter "Category=Coppa"

cd Web.E2E
$env:PLAYWRIGHT_BASE_URL = "https://<web-qa>"
npx playwright test --grep @coppa
```

Requisitos del entorno QA para que la capa caja negra no termine Inconclusive:

- `COPPA_EMAIL_PLUS_EXPOSE_TOKEN=true` y `RESEND_API_KEY` válido en el backend QA. **Nunca** en producción.
- Los correos de prueba usan direcciones `delivered+<etiqueta>@resend.dev` (no rebotan ni llegan a nadie).
- `STRIPE_WEBHOOK_SECRET` configurado (sin él, el webhook responde 503; la prueba igual exige “no 2xx”).

## 4. Brechas conocidas

- **COPPA-14** no tiene prueba de caja negra: falta un caso que cree un niño, lo exporte y lo borre contra QA.
- **`POST /parent-insights/{child_id}` no exige autenticación.** Sin permiso de IA responde la plantilla local,
  pero con permiso cualquiera que conozca el `child_id` puede disparar una llamada a OpenAI para ese niño.
  Recomendado: exigir token de adulto y propiedad del niño, y añadir el caso a `CoppaTests`.
- **COPPA-17** depende de documentos internos (programa de seguridad, retención, DPA firmado con OpenAI).
